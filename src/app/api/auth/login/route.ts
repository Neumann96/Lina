import { authenticateUser, normalizeEmail, setSession, validateEmail } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const email = normalizeEmail(typeof values.email === "string" ? values.email : "");
  const password = typeof values.password === "string" ? values.password : "";
  const emailError = validateEmail(email);
  if (emailError) return Response.json({ error: emailError, field: "email" }, { status: 400 });
  if (!password) return Response.json({ error: "Введите пароль", field: "password" }, { status: 400 });

  const user = await authenticateUser(email, password);
  if (!user) return Response.json({ error: "Неверная почта или пароль" }, { status: 401 });
  await setSession(user);
  return Response.json({ user });
}
