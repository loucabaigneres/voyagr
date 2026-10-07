import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'
import { trpc } from '../lib/trpc'

export const Route = createFileRoute('/join/$inviteCode')({
  component: JoinGroupPage,
})

function JoinGroupPage() {
  const { inviteCode } = Route.useParams()
  const navigate = useNavigate()
  const { data: session, isPending: isSessionLoading } = authClient.useSession()

  const {
    mutate: joinGroup,
    isPending: isJoining,
    error: joinError,
  } = useMutation(
    trpc.group.joinGroupTrip.mutationOptions({
      onSuccess: (data) => {
        navigate({ href: `/discovery?tripId=${data.tripId}` })
      },
    }),
  )

  if (isSessionLoading) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#F2EDE8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF4D4D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#F2EDE8] px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-[#eee] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF4D4D]/10 text-[#FF4D4D]">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </div>

        <h1 className="text-xl font-extrabold text-[#1A1A1A]">Rejoindre un voyage</h1>
        <p className="mt-1 text-xs text-[#888]">
          Tu as reçu une invitation pour participer à une aventure à plusieurs.
        </p>

        <div className="my-5 rounded-2xl bg-[#F2EDE8]/60 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Code d'invitation</span>
          <p className="text-lg font-black tracking-widest text-[#1A1A1A]">{inviteCode}</p>
        </div>

        {joinError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-[#FF4D4D]">
            {joinError.message}
          </div>
        )}

        {session?.user ? (
          <button
            type="button"
            disabled={isJoining}
            onClick={() => joinGroup({ inviteCode })}
            className="w-full cursor-pointer rounded-2xl bg-[#FF4D4D] py-3.5 text-xs font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          >
            {isJoining ? 'Connexion au groupe…' : 'Rejoindre le voyage'}
          </button>
        ) : (
          <div className="space-y-2.5">
            <Link
              to="/login"
              search={{ redirect: `/join/${inviteCode}` }}
              className="block w-full rounded-2xl bg-[#1A1A1A] py-3 text-xs font-bold text-white transition hover:bg-black"
            >
              Se connecter pour rejoindre
            </Link>
            <Link
              to="/register"
              search={{ redirect: `/join/${inviteCode}` }}
              className="block w-full rounded-2xl border border-[#ded7cb] bg-white py-3 text-xs font-bold text-[#1A1A1A] transition hover:bg-[#F2EDE8]"
            >
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}