# Lead relay — 5 minute setup

The exchange form on the tap card posts here, and this emails you the lead.
It runs in your own Google account, so no third-party service ever holds the
contact details of people you meet.

Until `formEndpoint` in `config.js` is filled in, the form tells the visitor
honestly that it could not send, and offers them a prefilled email instead.
It never claims a delivery that did not happen.

## Deploy

1. Go to <https://script.google.com> and click **New project**.
2. Delete the placeholder code, paste in everything from `Code.gs`, and save.
3. Click **Deploy → New deployment**.
4. Choose type **Web app**, then set:
   - **Execute as:** Me (your Google account)
   - **Who has access:** **Anyone** — this must be "Anyone", not "Anyone with
     a Google account", or visitors get a sign-in wall.
5. Click **Deploy**, then **Authorize access** and allow the permissions.
   Google will warn that the app is unverified: choose **Advanced → Go to
   (project name)**. That warning is expected for your own private script.
6. Copy the **Web app URL**. It ends in `/exec`.

## Verify

Open that `/exec` URL in a browser. You should see:

```json
{"ok":true,"service":"noody-tap lead relay"}
```

## Connect it

Paste the URL into `config.js`:

```js
formEndpoint: 'https://script.google.com/macros/s/AKfy…/exec',
```

Commit and push. Then fill in the form on the live card once and confirm the
email arrives. Do this before you fly, not in Kuala Lumpur.

## Notes

- Gmail's daily `MailApp` quota is 100 recipients a day on a free account,
  1,500 on Workspace. Either is far beyond a trade trip.
- Replies go to the person who filled in the form, not to a noreply address.
- If you later want the leads in a spreadsheet as well as your inbox, that is
  a two-line addition to `Code.gs` — ask and I will wire it.
