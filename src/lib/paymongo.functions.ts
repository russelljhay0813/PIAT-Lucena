import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

function getPayMongoHeaders() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured");
  }
  return {
    Authorization: `Basic ${btoa(secretKey + ":")}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Create a PayMongo payment link for deposit
export const createPaymentLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      amount: z.number().min(100, "Minimum deposit is ₱100").max(500000, "Maximum deposit is ₱500,000"),
      description: z.string().min(1).max(255),
      studentId: z.string().min(1).max(50),
      studentName: z.string().min(1).max(255),
    })
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${PAYMONGO_BASE_URL}/links`, {
        method: "POST",
        headers: getPayMongoHeaders(),
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(data.amount * 100), // PayMongo uses centavos
              description: data.description,
              remarks: `Student: ${data.studentName} (${data.studentId})`,
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`PayMongo API error [${res.status}]:`, JSON.stringify(err));
        return {
          success: false as const,
          error: `Payment creation failed (${res.status})`,
        };
      }

      const result = await res.json();
      const link = result.data;

      return {
        success: true as const,
        paymentLink: {
          id: link.id,
          checkoutUrl: link.attributes.checkout_url,
          referenceNumber: link.attributes.reference_number,
          amount: data.amount,
          status: link.attributes.status,
        },
      };
    } catch (error) {
      console.error("PayMongo request failed:", error);
      return {
        success: false as const,
        error: "Payment service is currently unavailable",
      };
    }
  });

// Retrieve payment link status
export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      linkId: z.string().min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${PAYMONGO_BASE_URL}/links/${data.linkId}`, {
        method: "GET",
        headers: getPayMongoHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`PayMongo status check error [${res.status}]:`, JSON.stringify(err));
        return {
          success: false as const,
          error: `Status check failed (${res.status})`,
        };
      }

      const result = await res.json();
      const link = result.data;

      return {
        success: true as const,
        payment: {
          id: link.id,
          amount: link.attributes.amount / 100,
          status: link.attributes.status as string,
          referenceNumber: link.attributes.reference_number as string,
          payments: (link.attributes.payments || []).map((p: any) => ({
            id: p.id,
            amount: p.attributes?.amount ? p.attributes.amount / 100 : 0,
            status: p.attributes?.status || "unknown",
            paidAt: p.attributes?.paid_at || null,
            paymentMethod: p.attributes?.source?.type || "unknown",
          })),
        },
      };
    } catch (error) {
      console.error("PayMongo status request failed:", error);
      return {
        success: false as const,
        error: "Payment service is currently unavailable",
      };
    }
  });

// List recent payment links (for transaction history)
export const listPayments = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      referencePrefix: z.string().max(100).optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(
        `${PAYMONGO_BASE_URL}/links?page[size]=10&page[number]=1`,
        {
          method: "GET",
          headers: getPayMongoHeaders(),
        }
      );

      if (!res.ok) {
        console.error(`PayMongo list error [${res.status}]`);
        return { success: false as const, error: "Failed to fetch payments" };
      }

      const result = await res.json();
      const links = result.data || [];

      return {
        success: true as const,
        payments: links.map((link: any) => ({
          id: link.id,
          amount: link.attributes.amount / 100,
          status: link.attributes.status,
          referenceNumber: link.attributes.reference_number,
          description: link.attributes.description,
          createdAt: link.attributes.created_at
            ? new Date(link.attributes.created_at * 1000).toISOString()
            : null,
          checkoutUrl: link.attributes.checkout_url,
        })),
      };
    } catch (error) {
      console.error("PayMongo list request failed:", error);
      return { success: false as const, error: "Payment service unavailable" };
    }
  });
