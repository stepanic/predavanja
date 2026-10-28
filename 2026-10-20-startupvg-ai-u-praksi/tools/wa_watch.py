#!/usr/bin/env python3
"""Prati WhatsApp grupu uživo i ispisuje svaku novu poruku u jednom retku.

Čita messages.db koji whatsapp-bridge puni u stvarnom vremenu (vidi
~/git/mcps/whatsapp-mcp/SETUP-ms.md), pa ne treba ništa slati WhatsAppu.
Namijenjen je Monitoru u Claude Codeu: svaki ispisani redak je jedna obavijest,
a terminal ide na projektor. Zato se ne ispisuju brojevi telefona, samo ime koje
je pošiljatelj sam postavio u WhatsAppu (push name).

  python3 tools/wa_watch.py "StartupVG AI"          # samo nove poruke
  python3 tools/wa_watch.py "StartupVG AI" --since 2026-10-02T17:30
"""
import argparse, sqlite3, sys, time
from datetime import datetime
from pathlib import Path

STORE = Path.home() / ".local/share/whatsapp-mcp/store"
MEDIA = {"image": "slika", "video": "video", "audio": "glasovna", "document": "dokument", "sticker": "sticker"}


def connect(name):
    # Samo za čitanje, da ne smetamo bridgeu koji piše u istu bazu.
    return sqlite3.connect(f"file:{STORE / name}?mode=ro", uri=True, timeout=5)


def find_group(db, query):
    if query.endswith("@g.us"):
        row = db.execute("SELECT name FROM chats WHERE jid = ?", (query,)).fetchone()
        return query, (row and row[0]) or query
    rows = db.execute(
        "SELECT jid, name FROM chats WHERE jid LIKE '%@g.us' AND name LIKE ? ORDER BY last_message_time DESC",
        (f"%{query}%",),
    ).fetchall()
    if not rows:
        sys.exit(f"nema grupe čije ime sadrži '{query}'")
    if len(rows) > 1:
        print(f"više grupa odgovara, uzimam najnoviju: {rows[0][1]}", file=sys.stderr)
    return rows[0]


def display_name(contacts, sender, cache):
    if sender not in cache:
        row = contacts.execute(
            "SELECT push_name, full_name FROM whatsmeow_contacts WHERE their_jid IN (?, ?) "
            "ORDER BY push_name IS NULL LIMIT 1",
            (f"{sender}@lid", f"{sender}@s.whatsapp.net"),
        ).fetchone()
        name = next((n for n in (row or ()) if n), None)
        cache[sender] = name.split()[0] if name else "netko"
    return cache[sender]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("group", help="dio imena grupe ili njezin JID")
    ap.add_argument("--since", help="ISO vrijeme od kojeg ispisati (zadano: od sada)")
    ap.add_argument("--interval", type=float, default=1.0)
    args = ap.parse_args()

    msgs, contacts = connect("messages.db"), connect("whatsapp.db")
    jid, name = find_group(msgs, args.group)
    since = datetime.fromisoformat(args.since).astimezone() if args.since else datetime.now().astimezone()
    cursor = since.isoformat(sep=" ", timespec="seconds")
    seen, names = set(), {}
    print(f"prate se poruke u grupi „{name}” od {since:%H:%M:%S}", flush=True)

    while True:
        try:
            rows = msgs.execute(
                "SELECT id, sender, content, timestamp, is_from_me, media_type FROM messages "
                "WHERE chat_jid = ? AND timestamp >= ? ORDER BY timestamp",
                (jid, cursor),
            ).fetchall()
        except sqlite3.OperationalError:  # baza je trenutno zaključana, pokušaj ponovno
            rows = []
        for mid, sender, content, ts, mine, media in rows:
            if mid in seen:
                continue
            seen.add(mid)
            cursor = max(cursor, ts)
            who = "Matija" if mine else display_name(contacts, sender, names)
            text = " ".join((content or "").split())
            if media:
                text = f"[{MEDIA.get(media, media)}] {text}".strip()
            stamp = datetime.fromisoformat(ts).astimezone().strftime("%H:%M:%S")
            print(f"{stamp}  {who}: {text}", flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
