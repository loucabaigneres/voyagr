import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc } from '../lib/trpc';

export function CreateGroupTripButton() {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: createGroup, isPending } = useMutation(
    trpc.group.createOrConvertGroupTrip.mutationOptions({
      onSuccess: (data) => {
        const url = `${window.location.origin}/join/${data.inviteCode}`;
        setInviteLink(url);
      },
    })
  );

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => createGroup({})}
        className="rounded-full bg-[#1A1A1A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-black active:scale-95 disabled:opacity-50"
      >
        {isPending ? 'Création…' : 'Créer un voyage de groupe'}
      </button>

      {inviteLink && (
        <div className="mt-4 rounded-2xl border border-[#ded7cb] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-[#1A1A1A]">Partage ce lien avec tes amis :</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-2 text-xs text-[#1A1A1A] outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl bg-[#FF4D4D] px-3 py-2 text-xs font-bold text-white transition hover:brightness-105"
            >
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
