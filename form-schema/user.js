import { z } from "zod";

export const UserNameSchema = z.object({
    name: z
        .string({ required_error: "Name is required" })
        .trim()
        .min(1, { message: "Name is required" }),
});

export const UserPermissionsSchema = z.object({
    manageUsers: z.boolean(),
    manageProducts: z.boolean(),
    manageInventory: z.boolean(),
});

// For PATCH permissions (partial allowed), but at least one boolean must be provided.
export const UserPermissionsPatchSchema = z
    .object({
        manageUsers: z.boolean().optional(),
        manageProducts: z.boolean().optional(),
        manageInventory: z.boolean().optional(),
    })
    .refine(
        (val) =>
            typeof val.manageUsers === "boolean" ||
            typeof val.manageProducts === "boolean" ||
            typeof val.manageInventory === "boolean",
        { message: "Provide at least one permission field to update" }
    );

export const UserCreateSchema = z.object({
    name: UserNameSchema.shape.name,
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email({ message: "Enter a valid email" }),
    password: z
        .string({ required_error: "Password is required" })
        .min(6, { message: "Min 6 characters" }),
    manageUsers: z.boolean(),
    manageProducts: z.boolean(),
    manageInventory: z.boolean(),
});

export const userCreateDefaultValues = {
    name: "",
    email: "",
    password: "",
    manageUsers: false,
    manageProducts: false,
    manageInventory: false,
};
