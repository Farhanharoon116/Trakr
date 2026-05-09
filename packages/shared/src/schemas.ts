import { z } from 'zod';

export const OTPRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^\+92[0-9]{10}$/, 'Phone must be in Pakistani format: +92XXXXXXXXXX'),
});

export const OTPVerifySchema = z.object({
  phone: z
    .string()
    .regex(/^\+92[0-9]{10}$/, 'Phone must be in Pakistani format: +92XXXXXXXXXX'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^[0-9]+$/, 'OTP must be numeric'),
});

export const CreateProductSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name_en: z.string().min(1, 'Product name (English) is required').max(255),
  name_ur: z.string().max(255).nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  price: z.number().positive('Price must be positive'),
  cost: z.number().nonnegative().nullable().optional(),
  tax_rate: z.number().min(0).max(100).default(17),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true),
  track_inventory: z.boolean().default(true),
});

export const CreateEmployeeSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Employee name is required').max(255),
  cnic: z
    .string()
    .regex(/^[0-9]{5}-[0-9]{7}-[0-9]$/, 'CNIC must be in format XXXXX-XXXXXXX-X')
    .nullable()
    .optional(),
  designation: z.string().max(255).nullable().optional(),
  hire_date: z.string().date().nullable().optional(),
  salary: z.number().nonnegative().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  emergency_contact: z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .nullable()
    .optional(),
  branch_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const CreateSaleSchema = z.object({
  branch_id: z.string().uuid(),
  shift_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().positive(),
        unit_price: z.number().nonnegative(),
        discount: z.number().nonnegative().default(0),
        tax_rate: z.number().min(0).max(100),
      })
    )
    .min(1, 'Sale must have at least one item'),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  payment_method: z.enum(['cash', 'card', 'easypaisa', 'jazzcash', 'credit']),
  notes: z.string().nullable().optional(),
  offline_id: z.string().uuid().nullable().optional(),
});

export type OTPRequest = z.infer<typeof OTPRequestSchema>;
export type OTPVerify = z.infer<typeof OTPVerifySchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type CreateSale = z.infer<typeof CreateSaleSchema>;
