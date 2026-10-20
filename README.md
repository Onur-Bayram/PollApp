# PollApp

PollApp ist eine responsive Web-App zum Erstellen und Beantworten von Umfragen. Die Oberfläche wurde anhand einer Figma-Vorlage für Desktop und Smartphone umgesetzt. Umfragen und Stimmen werden in Supabase gespeichert; die Ergebnisse aktualisieren sich live.

## Funktionen

- Übersicht mit aktiven und vergangenen Umfragen sowie einem Kategorienfilter.
- Die drei als Nächstes endenden Umfragen als hervorgehobene Karten.
- Neue Umfragen direkt in einem Overlay erstellen und veröffentlichen.
- Bis zu sechs Fragen mit jeweils zwei bis sechs Antwortmöglichkeiten.
- Einfach- oder Mehrfachauswahl je Frage.
- Optional eine Kategorie, eine Beschreibung und ein Enddatum ergänzen.
- Bestätigung nach dem Veröffentlichen; beim Schließen öffnet sich die neue Umfrage.
- Mit „Complete“ abstimmen und die Ergebnisse als Balkendiagramme sehen.
- Mit „Vote again“ die eigene gespeicherte Abgabe zurücknehmen und erneut abstimmen.
- Vergangene Umfragen und ihre Ergebnisse ansehen; weitere Abstimmungen sind gesperrt.
- Mobile Ergebnisse über „See results“ und „Close results“ ein- und ausklappen.

## Technik

- Angular 22 und TypeScript
- HTML und CSS in separaten Component-Dateien
- Angular Reactive Forms für die Formulare
- Supabase für die Datenbank und Live-Aktualisierungen
- localStorage zum Wiedererkennen der gespeicherten Abstimmung im selben Browser
- Lokale Bilder, Icons und Schriftdateien unter `public/assets`

## Lokal starten

Voraussetzung: Node.js 22 ab Version 22.22.3 oder Node.js 24 ab Version 24.15.0 sowie npm.

```sh
git clone https://github.com/Onur-Bayram/PollApp.git
cd PollApp
npm ci
npm start
```

Anschließend die App unter **http://localhost:4200/** öffnen. Die Angular-Vorschau wird mit `npm start` gestartet.

## Supabase

Die Browser-Verbindung wird in `src/environments/environment.ts` konfiguriert. Die aktuelle Konfiguration verbindet die App mit dem vorhandenen Projekt-Backend.

Für ein eigenes Backend werden die Tabellen `surveys`, `questions`, `answers` und `votes` mit ihren Beziehungen benötigt. Außerdem müssen passende Zugriffsregeln eingerichtet und Live-Änderungen für die Stimmen aktiviert werden. Nur das Ersetzen der URL und des öffentlichen Schlüssels legt dieses Datenmodell noch nicht an.

## Abstimmungen und „Vote again“

Die App benötigt kein Benutzerkonto. Nach einer erfolgreichen Abstimmung merkt sich der Browser die Auswahl und die IDs der gespeicherten Stimmen. Beim erneuten Öffnen derselben Umfrage bleibt die Abgabe dadurch erkennbar.

„Vote again“ löscht die zu dieser Abgabe gespeicherten Stimmen, bevor eine neue Abstimmung möglich wird. Die Wiedererkennung gilt für denselben Browser. Ein anderer Browser oder das Löschen der Browserdaten kann sie zurücksetzen; die App garantiert deshalb keine Beschränkung auf eine Stimme pro Person.

## Projektstruktur

```text
src/app/
  models/       Datenmodelle und gemeinsame Grenzen
  pages/        Startseite, Umfrageformular, Detailansicht und Bestätigung
  services/     Supabase, Umfragen, Ergebnisse und gespeicherte Abstimmungen
src/environments/
                Öffentliche Supabase-Verbindungskonfiguration
public/assets/  Bilder, Icons und Schriftdateien
```

## Ansichten

| Pfad | Inhalt |
| --- | --- |
| `/` | Startseite mit Umfragen und Filtern |
| `/survey/:id` | Gespeicherte Umfrage mit Abstimmung und Ergebnissen |
| `/survey` | Separate Designvorschau ohne echte Stimmabgabe |
| `/thumbnail` | Statisches Projektvorschaubild |

Das Erstellungsformular öffnet sich als Overlay und hat keine eigene Route.

## Produktionsbuild

```sh
npm run build
```

Die Build-Dateien werden unter `dist/pollapp/` erzeugt. Beim Hosting müssen Aufrufe von Angular-Routen wie `/survey/11` auf die `index.html` zurückfallen.

## Gestaltung

Die Gestaltung basiert auf der bereitgestellten Figma-Vorlage „Poll App Design“. Die Umsetzung verwendet die Schriftarten Nerko One, Mulish und Nokora sowie die mitgelieferten Grafiken.
