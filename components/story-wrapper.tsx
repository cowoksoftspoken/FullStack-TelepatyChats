import useUserStatus from "@/hooks/use-user-status";
import { StoryCircle } from "./story/story-circle";
import { User } from "@/types/user";

export function StoryCircleWrapper({
  storyUser,
  currentUser,
}: {
  storyUser: User;
  currentUser: User;
}) {
  const { isBlocked, isUserBlockedByContact } = useUserStatus(
    storyUser.uid,
    currentUser.uid
  );

  const blocked = isBlocked || isUserBlockedByContact;

  if (blocked) return null;

  return (
    <div key={storyUser.uid} className="flex flex-col items-center">
      <StoryCircle
        key={storyUser.uid}
        user={storyUser}
        currentUser={currentUser}
      />
      <span className="mt-1 text-xs truncate max-w-[64px] flex items-center gap-1">
        {storyUser.displayName.split(" ")[0]}
        {storyUser.isVerified && !storyUser.isAdmin && (
          <svg
            aria-label="Sudah Diverifikasi"
            fill="rgb(0, 149, 246)"
            height="14"
            role="img"
            viewBox="0 0 40 40"
            width="14"
          >
            <title>Verified</title>
            <path
              d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
              fillRule="evenodd"
            ></path>
          </svg>
        )}
        {storyUser.isAdmin && (
          <svg
            aria-label="Afiliated Account"
            height="15"
            role="img"
            viewBox="0 0 40 40"
            width="15"
          >
            <defs>
              <linearGradient
                id="metallicGold"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stop-color="#fff7b0" />
                <stop offset="25%" stop-color="#ffd700" />
                <stop offset="50%" stop-color="#ffa500" />
                <stop offset="75%" stop-color="#ffd700" />
                <stop offset="100%" stop-color="#fff7b0" />
              </linearGradient>
            </defs>
            <title>Afiliated Account</title>
            <path
              d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
              fill="url(#metallicGold)"
              fill-rule="evenodd"
            ></path>
          </svg>
        )}
      </span>
    </div>
  );
}
