# Recognition test page

Based on main commit 2449e69 (local ASL images), including demo mode and the previous recognition/session fixes. No model weights, quiz behavior, or training preprocessing changed.

## Install and open

Apply this patch at the repository root:

```sh
git apply --check Smartclusive_Test_Page.patch
git apply Smartclusive_Test_Page.patch
```

Restart your Flask backend. Rebuild/restart the frontend with your existing backend URL and `VITE_DEMO_MODE=false`. Vite flags are build-time flags, so restart/rebuild after changing them. Sign in normally, then open `/test` on your frontend (for example `http://localhost:5173/test`). The page needs no deck words. Production hosting must fall back to index.html for `/test`, just like `/quiz`.

1. Select D and enter a pseudonymous signer nickname.
2. Click **Start camera** and allow camera access. Use HTTPS or localhost.
3. Make the sign and hold it. Check the top guesses and the analyzed frame's yellow fingertips/green skeleton.
4. Click **Record 4-second example**, hold the sign, then **Download example**.
5. Download before recording another attempt. Repeat five times each for D, S and K. Include correct predictions, incorrect predictions, and UNKNOWN/no-hand examples.
6. Click **Stop camera**. Share the downloaded JSON files for review when ready.

A recording contains up to 20 sampled JPEG frames and paired predictions, timestamps, tracker handedness, timings, intended label and signer nickname. It is not continuous video. Images can contain faces/backgrounds. Frames are sent to the existing backend during testing; recordings are held in tab memory until downloaded, not written to the backend. Reloading discards them. Intended labels are unreviewed metadata and never enter prediction requests. Recording stops on errors/stop; download may contain fewer frames. An in-flight response finishing after the recording window closes is excluded.

## What changed

- Lazy `/test` route using existing authentication; demo builds explain how to enable real inference instead of displaying fake results.
- Separate authenticated `/api/sign/test/start`, `/frame`, `/stop` endpoints; maximum 8 diagnostic sessions, 120-second idle expiration on next manager access, owner isolation and frame sequence checks.
- Per-session persistent tracker, exact-frame overlay with unmirrored image coordinates, unchanged 77-feature extraction and existing alphabet ranking.
- Stable output uses the existing confidence, margin, three-frame and 250 ms hold rules without knowing the intended letter. Changing guesses or long frame gaps resets stability. Raw guesses stay visible so K→U transitions can be diagnosed.
- Normal signing paths retain their existing behavior. Backend must still use one worker for in-memory sessions.

## Known reports (not validated training labels)

| Intended/observed pose | Output reported | Review |
|---|---|---|
| Intended D | R, V, uncertain | Capture tracking and margins |
| F-like pose | D accepted | Verify actual pose before labeling |
| Sideways nonstandard pose | H | Do not automatically label as D |
| Intended S | M, A | Review thumb/finger occlusion |
| K transition | U briefly, then K | Compare raw vs stable output |

## Next accuracy work

These tools do not fix classifier accuracy or establish that a user's pose is correct. Review recordings with an ASL-competent labeler first. Separate tracker mistakes, invalid/transition poses, and classifier mistakes. Keep clips from the same signer/session in the same dataset split; never split neighboring frames between training and evaluation. Use reviewed failed examples plus correct and negative examples for evaluation before retraining. Compare D/R/V, S/M/A, K/U, false acceptance, uncertainty coverage and latency. Preserve the old model until a replacement improves held-out signers without unacceptable regressions. J/Z motion and lexical word recognition require temporal models; spelling a word letter-by-letter is a different task.

The current handedness mirroring/77-feature contract is intentionally preserved: changing it without retraining would make model inputs incompatible. The overlay is captured before x-mirroring to expose tracker errors without changing predictions.

## Validation

35 backend tests and 10 frontend tests passed; TypeScript/Vite production build passed. Tests cover diagnostic authentication/ownership, target-blind ranking, stability resets, tracker reuse/cleanup, frame duplicates, missing model, unchanged feature vectors, and opt-in recording. Live camera accuracy still needs the user's recorded examples. No deployment or remote push is included.
