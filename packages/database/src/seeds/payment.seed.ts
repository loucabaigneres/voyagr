import { paymentTransaction } from "../schemas/payment.js";
import { FAKE_USER_ID } from "./inspiration.seed.js";
import { TRIP_ID } from "./trip.seed.js";

export async function seedPayments(db: ReturnType<typeof import("../index.js").createClient>) {
  await db.insert(paymentTransaction).values([
    {
      userId: FAKE_USER_ID,
      tripId: TRIP_ID,
      stripeSessionId: "cs_test_123456789",
      amount: 999,
      currency: "EUR",
      status: "completed",
    }
  ]).onConflictDoNothing();
}