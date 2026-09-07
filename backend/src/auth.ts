import jwt from "jsonwebtoken";
import type { Session } from "./types";

export const JWT_SECRET = process.env.JWT_SECRET || "aot_signage_secret_2024";

export function signToken(payload: Session): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): Session {
  return jwt.verify(token, JWT_SECRET) as Session;
}
