import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid hex color');
const uuid = z.string().uuid();
const email = z.string().email().max(256);
const boardName = z.string().min(1).max(1024);

const MAX_CONTENT_BYTES = 4096;
const finitePosition = z.number().finite();
const optionalNullableFinitePosition = finitePosition.nullable().optional();
const optionalNullableContent = z.string().max(MAX_CONTENT_BYTES).nullable().optional();
const optionalNullableColor = hexColor.nullable().optional();

export const boardUpsertWithInviteSchema = z.object({
  board: z.object({
    name: boardName,
    background_color: hexColor,
  }),
  addBoardUser: z.union([email, z.literal('')]).optional(),
});

export const boardUpdateSchema = z.object({
  name: boardName,
  background_color: hexColor,
});

export const boardItemCreateSchema = z.object({
  boardId: uuid,
  x: finitePosition,
  y: finitePosition,
});

export const boardItemUpdateSchema = z.object({
  content: optionalNullableContent,
  x: optionalNullableFinitePosition,
  y: optionalNullableFinitePosition,
  color: optionalNullableColor,
});

export const createBoardSchema = z.object({
  name: boardName,
  color: hexColor,
});

export const authInitiateSchema = z.object({
  returnTo: z.string().max(2048).optional(),
});

export const parseJson = async <T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new Response('invalid JSON body', { status: 400 });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Response(`invalid request: ${result.error.issues[0].path.join('.')}: ${result.error.issues[0].message}`, { status: 400 });
  }
  return result.data;
};

export const parseFormData = async <T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> => {
  let raw: Record<string, FormDataEntryValue>;
  try {
    const form = await request.formData();
    raw = Object.fromEntries(form);
  } catch {
    throw new Response('invalid form data', { status: 400 });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Response(`invalid request: ${result.error.issues[0].path.join('.')}: ${result.error.issues[0].message}`, { status: 400 });
  }
  return result.data;
};
