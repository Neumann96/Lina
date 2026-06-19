import { normalizeEmail, registerUser, setSession, validateEmail, validatePassword } from "@/lib/auth";

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
  const confirmation = typeof values.confirmation === "string" ? values.confirmation : "";
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError) return Response.json({ error: emailError, field: "email" }, { status: 400 });
  if (passwordError) return Response.json({ error: passwordError, field: "password" }, { status: 400 });
  if (password !== confirmation) return Response.json({ error: "Пароли не совпадают", field: "confirmation" }, { status: 400 });

  const user = await registerUser(email, password);
  if (!user) return Response.json({ error: "Аккаунт с этой почтой уже существует", field: "email" }, { status: 409 });
  await setSession(user);
  return Response.json({ user }, { status: 201 });
}
