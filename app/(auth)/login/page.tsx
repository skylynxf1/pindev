import LoginForm from './LoginForm'

interface Props {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext } = await searchParams
  const next = Array.isArray(rawNext) ? rawNext[0] : (rawNext ?? '/')
  const safeNext = next.startsWith('/') ? next : '/'
  return <LoginForm next={safeNext} />
}
