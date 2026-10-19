-- Hold AI generation while the public-only input and opt-in safeguard roll out.
-- Statistics collection and the displayed activity summary remain available.
revoke execute on function public.claim_leaderboard_insight(date,text) from service_role;
