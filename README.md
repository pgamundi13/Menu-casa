# Menú de casa

Planificador setmanal de dinars i sopars amb receptari compartit i llista de la compra automàtica, ordenada per seccions del súper.

PWA instal·lable, en català. Les dades viuen a Supabase: **tots els mòbils de casa veuen el mateix i els canvis arriben a l'instant**.

---

## 1. Preparar la base de dades

Supabase ▸ **SQL Editor** ▸ **New query** ▸ enganxa `supabase.sql` sencer ▸ **Run**.

Crea quatre taules (`recetas`, `menu`, `extras`, `marcados`), els dóna permís de lectura i escriptura, activa Realtime i posa una recepta de prova.

**Es pot executar tantes vegades com calgui.** No esborra receptes ni duplica la recepta de prova, i no falla si ja ho havies executat abans.

Si dóna un error de sintaxi, l'enganxada s'ha embolicat: buida l'editor del tot (Ctrl+A i esborra), torna a copiar el fitxer sencer i prova-ho un altre cop. Si continua fallant, executa els blocs 1, 2, 3, 4 i 5 un per un: estan separats i numerats dins del fitxer.

> Els noms de les columnes són en castellà per dins. No es veuen enlloc de l'app i canviar-los voldria dir tornar a començar la base de dades.

## 2. Pujar-ho a GitHub Pages

A l'arrel del repositori: `index.html`, `app.js`, `manifest.json`, `sw.js` i la carpeta `icons/`.

**Settings ▸ Pages ▸ Deploy from a branch**, branca `main`, carpeta `/ (root)`.

La connexió a Supabase ja va dins d'`index.html`: no hi ha res a configurar al mòbil.

En actualitzar arxius, puja el canvi **i** apuja la versió de la memòria cau a `sw.js` (`menu-casa-v6` → `v7`), o els mòbils continuaran amb la versió antiga.

## 3. Instal·lar-ho al mòbil

Obre `https://pgamundi13.github.io/Menu-casa/` i fes **Afegir a la pantalla d'inici**. Obre-la sempre des de la icona, no des del navegador.

---

## Com es fa servir

**Setmana** — Set dies amb Dinar i Sopar. Toca un lloc buit per posar-hi una recepta i dir per a quantes racions. La × la treu. La barra de dalt diu quants dels 14 llocs estan posats.

**Receptes** — Receptari compartit: nom, icona, racions base, ingredients (quantitat, unitat i secció del súper) i notes.

**Compra** — Es genera sola amb les receptes de la setmana. Els ingredients repetits se sumen i les quantitats s'escalen segons les racions de cada dia. Toca per marcar el que ja és al carro: si algú és al súper, ho veu ratllat a l'instant.

### La secció del súper es posa sola

En escriure un ingredient, l'app endevina a quina secció va. Entén català i castellà, i també els plurals: *taronges*, *cigrons*, *llenties*, *ous*. Té en compte els paranys de les paraules curtes (*cavall* no va a les begudes per culpa de *cava*) i el congelador mana sobre la resta (*pèsols congelats* van al congelador, no amb la verdura fresca). Sempre es pot canviar a mà.

---

## Com funciona la sincronització

Cada recepta, cada dia del menú i cada article marcat és **una fila pròpia** a la base de dades. Quan algú canvia alguna cosa, Supabase avisa la resta de mòbils per Realtime i només es recarrega el que ha canviat.

- Dues persones poden editar **receptes diferents alhora** sense trepitjar-se.
- Els canvis surten en un parell de segons, sense tocar res.
- En tornar a l'app des d'una altra aplicació, es recarrega per si de cas.
- **Sense cobertura pots mirar** el menú i la llista (en queda una còpia al mòbil), però no desar.

## Estat i problemes

El punt de la barra de dalt: verd connectat, groc carregant, vermell problema. Tocant **Estat** es veu el detall i hi ha **Recarregar ara**.

Si alguna cosa no surt a un altre mòbil:

1. Tanca l'app del tot i torna-la a obrir.
2. Mira el punt d'estat: si és vermell, el missatge diu què falla.
3. Si diu que falta preparar la base de dades, torna al pas 1 i executa el SQL.

## Sobre la seguretat

La clau `publishable` va dins del codi de l'app, que és públic a GitHub. És el normal: aquestes claus estan fetes per anar al client.

Dit clar: **qui sàpiga l'adreça de l'app pot veure i editar el menú.** No hi ha usuaris ni contrasenyes, igual que a l'Agenda de casa. Per al menú d'una casa va bé; no hi posis res privat.
