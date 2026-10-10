export const MEMBER_COUNT = 50;

// A few warm gradient avatars to suggest a real community without using photos.
const AVATARS = [
  'from-[#ff9a6b] to-[#ff4d6d]',
  'from-[#7fb2a0] to-[#4f8c79]',
  'from-[#ffcf6b] to-[#ff914d]',
  'from-[#8aa0ff] to-[#5f6fd8]',
];

type SocialProofProps = {
  className?: string;
  align?: 'center' | 'start';
};

export function SocialProof({ className = '', align = 'center' }: SocialProofProps) {
  return (
    <div
      className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : 'justify-start'} ${className}`}
    >
      <div className="flex -space-x-2">
        {AVATARS.map((gradient, i) => (
          <span
            key={i}
            className={`h-7 w-7 rounded-full border-2 border-cream bg-gradient-to-br ${gradient}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-ink">
        Déjà <span className="text-accent">{MEMBER_COUNT} membres</span> inscrits
      </p>
    </div>
  );
}
