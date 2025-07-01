
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to serialize data with complex types (like Date, Decimal)
// from server components to client components.
export const serialize = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        // Prisma Decimal type is serialized as a string. We can convert it here
        // or handle it on the client side. For now, we pass as is.
        return value;
    }));
};
