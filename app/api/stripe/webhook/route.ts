import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, webhookSecret } from "@/lib/stripe";
import { FREE_STORAGE, PREMIUM_STORAGE, isActive } from "@/lib/plans";

export const runtime = "nodejs";

// Stripe envoie des événements ici. Le corps brut est requis pour vérifier
// la signature — d'où l'usage de req.text().
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = webhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch (err) {
    return NextResponse.json({ error: `Signature invalide: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(stripe, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(stripe, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // On répond 200 pour éviter des relances infinies sur une erreur métier,
    // mais on journalise pour investigation.
    console.error("Stripe webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}

/** Applique l'état d'un abonnement Stripe au compte utilisateur. */
async function syncSubscription(stripe: Stripe, sub: Stripe.Subscription) {
  // Retrouve l'utilisateur : par metadata, puis par client Stripe.
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId: string | undefined = sub.metadata?.userId;
  if (!userId) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    userId = user?.id;
  }
  if (!userId) {
    // Dernier recours : metadata du client.
    const customer = await stripe.customers.retrieve(customerId);
    if (!("deleted" in customer) || !customer.deleted) {
      userId = (customer as Stripe.Customer).metadata?.userId;
    }
  }
  if (!userId) return;

  const premium = isActive(sub.status);
  // La fin de période est sur l'abonnement (anciennes API) ou sur l'item
  // (API récentes) : on lit l'un ou l'autre sans dépendre du typage exact.
  const rawSub = sub as unknown as { current_period_end?: number };
  const rawItem = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
  const periodEnd = rawItem?.current_period_end ?? rawSub.current_period_end ?? null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: premium ? "premium" : "free",
      planStatus: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.status === "canceled" ? null : sub.id,
      planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      storageLimit: BigInt(premium ? PREMIUM_STORAGE : FREE_STORAGE),
    },
  });
}
