# YouTube search video campaign

Put a short Already Here video at the top of YouTube search for the phrases our
buyers and techs type, and send the people who click to a landing page made for
them. This is the Google Ads **in-feed video ad** (shown above YouTube search
results), run in a Video campaign with the **Product and brand consideration**
goal and **Target CPV** bidding, so we pay for views, not impressions.

Nothing here spends money. Every lane ships with `launchApproved: false`, and ad
spend is `any_cost` in `approvals/policy.yaml`.

## Lanes

| Lane | Who | Lands on | Converts on |
| --- | --- | --- | --- |
| `msp-smart-hands` | MSPs and national vendors needing a Phoenix tech | `/video/msp-smart-hands` | `/rfq` |
| `phoenix-business-it` | Valley offices, retail, warehouses | `/video/phoenix-business-it` | `/rfq` |
| `field-tech-recruiting` | Independent 1099 field techs | `/video/field-tech-recruiting` | `/technician-network` |

The plan (search phrases, excluded words, locations, headline, description,
script, proposed budget and max CPV) lives in `lib/youtube-video-campaign.ts`.

## What the code does

- `auditVideoLane` checks each lane against the in-feed asset limits: headline
  100 chars max (warns past 25, where some devices cut it), description 2 lines
  of 35 chars, video 10 seconds or longer (shorter videos never count a view),
  plain site paths, a valid 11-character video ID. A lane is launch-ready only
  with a video ID **and** `launchApproved: true`.
- `buildLandingUrl` makes the ad's final URL with
  `utm_source=youtube&utm_medium=video_infeed&utm_campaign=<lane>&utm_content=<version>`.
- `/video/<lane>` pages are `noindex`, and pass `utm_*` and `gclid` through to
  the form page. The RFQ form now records campaign, video version and Google
  Ads click ID in the request it sends.
- `npm run campaign:youtube` validates every lane and writes
  `exports/youtube-video-campaign/launch-sheet.csv` (one row per campaign, for
  entering in Google Ads) and `shoot-sheet.md` (shot list and lines per video).
- `npm run test:youtube-campaign` covers the validator, URL tracking and exports.

## Launch steps (owner)

1. Film each 30-second video from `shoot-sheet.md` (a phone is fine, 1080p,
   horizontal or vertical).
2. Upload to the Already Here YouTube channel as **unlisted** or public.
3. Put the video ID in the lane's `youtubeVideoId` and run `npm run campaign:youtube`.
4. In Google Ads: new campaign → goal **Product and brand consideration** →
   Video → in-feed ads. Use the launch sheet for bidding, budget, locations,
   headline, description and final URL. Add the search phrases as keywords and
   the excluded words as negatives. Confirm in the Ads screen that keyword
   targeting is offered for this campaign type before relying on it.
5. Approve the spend for that lane, set `launchApproved: true`, and only then
   turn the campaign on.
6. After a week, compare views, clicks and RFQ or applicant submissions per
   `utm_campaign` and keep the lanes that bring real requests.

Source for the limits: Google Ads Help, "In-feed video ads"
(support.google.com/google-ads/answer/6227733), read 2026-11-26.
