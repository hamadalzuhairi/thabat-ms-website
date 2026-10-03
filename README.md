# Thabat MS (ثبات MS) · website and clinic dashboard demo

Healthon 2026 prototype. Thabat MS is an Android app idea that looks for early signs of an MS relapse in everyday phone tapping, and helps patients keep track of their medicines. This repository holds only the public website and demos:

| Path | What it is |
| --- | --- |
| `website/` | Patient website (Arabic and English) |
| `website/clinic/` | Clinic dashboard demo for MS neurologists and nurses |
| `prototype/thabat-app-prototype.html` | Clickable phone-app prototype, shown inside the website |

**Every patient and number here is simulated.** Thabat MS is not a medical device and has not been reviewed by the SFDA. The alert rules in the demos are stand-in placeholders until a supervised pilot; they are not a clinical method. It is not an emergency service: for sudden or severe symptoms, go to the nearest emergency department.

## Run locally

Any static file server works, for example:

```bash
python -m http.server 8766
```

Then open http://localhost:8766/website/ and http://localhost:8766/website/clinic/.

## Deploy

The site is static. `vercel.json` sends `/` to `/website/`. No build step.
