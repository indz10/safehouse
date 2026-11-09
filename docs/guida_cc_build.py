from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
F='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('S',F+'DejaVuSans.ttf'));pdfmetrics.registerFont(TTFont('SB',F+'DejaVuSans-Bold.ttf'));pdfmetrics.registerFont(TTFont('M',F+'DejaVuSansMono.ttf'))
INK=colors.HexColor('#140f1f');NIGHT=colors.HexColor('#241a4a');MOON=colors.HexColor('#f7d64a');RED=colors.HexColor('#d7263d');CREAM=colors.HexColor('#f3e9d2');GREEN=colors.HexColor('#2f7a52')
st=lambda n,**k:ParagraphStyle(n,**k)
T=st('t',fontName='SB',fontSize=26,leading=30,textColor=INK,spaceAfter=6)
H=st('h',fontName='SB',fontSize=16,leading=20,textColor=NIGHT,spaceBefore=10,spaceAfter=6)
H3=st('h3',fontName='SB',fontSize=12.5,leading=16,textColor=INK,spaceBefore=6,spaceAfter=3)
P=st('p',fontName='S',fontSize=10.5,leading=14.5,textColor=INK,spaceAfter=4)
SM=st('sm',fontName='S',fontSize=9,leading=12,textColor=colors.HexColor('#5a5470'))
C=st('c',fontName='M',fontSize=8.6,leading=11.5,textColor=INK)
B=st('b',parent=P,leftIndent=12,bulletIndent=2)
def box(txt,bg=CREAM):
    t=Table([[Paragraph(txt,P)]],colWidths=[170*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),1.6,INK),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));return t
def code(txt):
    lines=txt.strip('\n').split('\n');t=Table([[Paragraph(l.replace('&','&amp;').replace('<','&lt;').replace(' ','&nbsp;') or '&nbsp;',C)] for l in lines],colWidths=[170*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#fffbe6')),('BOX',(0,0),(-1,-1),1.4,INK),('LEFTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),0.6),('BOTTOMPADDING',(0,0),(-1,-1),0.6)]));return t
def steps(rows):
    data=[[Paragraph(f'<b>{i}</b>',st('n',fontName='SB',fontSize=11,alignment=1)),Paragraph(r,P)] for i,r in rows]
    t=Table(data,colWidths=[11*mm,159*mm]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(0,-1),MOON),('BOX',(0,0),(-1,-1),1.2,INK),('INNERGRID',(0,0),(-1,-1),0.6,INK),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]));return t
def tab(head,rows,w):
    data=[[Paragraph(f'<b>{h}</b>',st('th',fontName='SB',fontSize=9.5,leading=12,textColor=colors.white)) for h in head]]+[[Paragraph(c,st('td',fontName='S',fontSize=9.3,leading=12.2,textColor=INK)) for c in r] for r in rows]
    t=Table(data,colWidths=w,repeatRows=1);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NIGHT),('BOX',(0,0),(-1,-1),1.2,INK),('INNERGRID',(0,0),(-1,-1),0.5,INK),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,CREAM]),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]));return t
def foot(c,d):
    c.saveState();c.setFillColor(NIGHT);c.rect(0,0,A4[0],12*mm,fill=1,stroke=0);c.setFillColor(MOON);c.setFont('SB',9);c.drawString(15*mm,4.5*mm,'ZombieSafeHouse · Guida Claude Code');c.setFillColor(colors.white);c.setFont('S',9);c.drawRightString(A4[0]-15*mm,4.5*mm,f'pagina {d.page}');c.restoreState()
s=[]
s+= [Paragraph('ZombieSafeHouse',st('k',fontName='SB',fontSize=12,textColor=RED)),Paragraph('Guida a Claude Code e road map di pulizia',T),Paragraph('Versione di partenza: zsh-202611050013 · 8 novembre 2026',SM),Spacer(1,8)]
s+= [Paragraph('1. Cos’è e perché',H),Paragraph('Oggi ogni modifica passa da qui: io scrivo il codice, tu scarichi i file, li rinomini, li carichi su GitHub e aspetti Netlify. Con <b>Claude Code nel browser</b> lavori sul progetto vero: scrivi cosa vuoi (anche dal telefono, con una foto), Claude modifica e prova il progetto su un computer di Anthropic e ti prepara su GitHub una <b>proposta di modifica</b>. Tu la guardi e premi <b>un pulsante verde</b>: Netlify pubblica da solo.',P)]
s+= [box('<b>Perché adesso.</b> L’app è cresciuta per strati: alcune funzioni sono “avvolte” da 6 a 14 moduli diversi, e sotto c’è ancora il vecchio gioco a carte (12 moduli, circa 267 KB). Molti difetti degli ultimi giorni nascevano da lì. Pulire in chat, un file alla volta, non basta più.'),Spacer(1,6)]
s+= [box('<b>Da sapere.</b> Non serve installare niente: va bene anche il Mac vecchio, oppure l’app Claude sull’iPhone. Claude Code usa lo <b>stesso limite settimanale</b> della chat: le fasi grosse conviene lanciarle dopo il rinnovo settimanale. Le foto dal telefono restano fondamentali: nemmeno Claude Code vede il tuo iPhone o il tuo Supabase.',colors.HexColor('#fff3b0'))]
s+= [Paragraph('2. Come funziona ogni volta',H),steps([(1,'Scrivi a Claude Code cosa vuoi (o incolla il messaggio della fase).'),(2,'Claude lavora e apre su GitHub una <b>pull request</b> (proposta di modifica) con scritto cosa controllare sul telefono.'),(3,'Se Netlify crea un’<b>anteprima</b> (link “Deploy Preview” nella proposta), aprila sul telefono e prova.'),(4,'Su GitHub, nella proposta: <b>Merge pull request</b> → <b>Confirm merge</b>. Netlify pubblica in 1 minuto.'),(5,'Se qualcosa va storto: nella stessa proposta premi <b>Revert</b> e torna tutto come prima.')])]
s+= [PageBreak(),Paragraph('3. Preparazione (una volta sola)',H)]
s+= [Paragraph('Tappa A · Mettere il progetto su GitHub',H3),steps([(1,'Scarica dalla chat <b>ZombieSafeHouse_sorgenti.zip</b> (l’ultimo). Non aprirlo.'),(2,'Safari → <b>github.com/indz10/safehouse</b> → <b>Add file → Upload files</b>.'),(3,'Trascina lo zip nel riquadro → in fondo <b>Commit changes</b>.'),(4,'Controllo: nell’elenco dei file compare <b>ZombieSafeHouse_sorgenti.zip</b>. Il sito non cambia.')])]
s+= [Paragraph('Tappa B · Aprire Claude Code e collegarlo a GitHub',H3),steps([(1,'Safari → <b>claude.ai/code</b> → accedi con il tuo account Claude.'),(2,'Quando lo chiede, collega <b>GitHub</b>: si apre GitHub, accedi e premi <b>Authorize</b>.'),(3,'GitHub chiede su quali repository installare l’app Claude: scegli <b>Only select repositories</b> → <b>indz10/safehouse</b> → <b>Install</b>.'),(4,'Torna su claude.ai/code: scegli il repository <b>indz10/safehouse</b>. Se chiede un “ambiente”, lascia le impostazioni proposte e conferma.'),(5,'Controllo: vedi la casella per scrivere a Claude con <b>indz10/safehouse</b> selezionato.')])]
s+= [Paragraph('Tappa C · Il primo messaggio (Fase 1)',H3),Paragraph('Copia e incolla questo testo nella casella di Claude Code:',P),code('''Leggi CLAUDE.md e ROADMAP.md dentro ZombieSafeHouse_sorgenti.zip
(estrailo prima in una cartella temporanea per leggerli).
Poi esegui la Fase 1 della road map: sorgenti alla radice del repository,
netlify.toml con publish = "dist", build funzionante, prove principali.
Apri una pull request "Fase 1 — Fondamenta" con, in italiano,
cosa devo controllare sul telefono (massimo 5 punti).
Guidami un passo alla volta per tutto quello che devo fare io.''')]
s+= [PageBreak(),Paragraph('4. La road map in 10 fasi',H),Paragraph('Una fase alla volta, nell’ordine. Ogni fase è una proposta separata: se una non ti convince, si annulla solo quella.',P)]
s+= [tab(['Fase','Cosa fa Claude Code','Cosa controlli tu sul telefono'],[
 ['1 · Fondamenta','Mette i sorgenti su GitHub, Netlify pubblica da solo la cartella costruita. Niente più file caricati a mano.','L’app funziona come prima; versione nuova in fondo al menu.'],
 ['2 · Mappa del codice','Solo un rapporto: cosa fa ogni modulo, cosa è morto, cosa è doppio, nuova struttura proposta.','Leggi il riassunto di 10 righe e rispondi “ok”.'],
 ['3 · Via il gioco a carte','Toglie battaglia a carte, campagna, arena, vecchi presidi, monete, attrezzi. Tiene ruota, gratta e vinci, premio del giorno, missioni.','Orda, ruota, gratta e vinci, premio del giorno funzionano; app più leggera.'],
 ['4 · Una funzione per cosa','Riscrive per aree (casa, mappa, orda, superstiti, menu, comune): ogni funzione esiste una volta sola.','Tutte le schermate uguali o più chiare; nessuna funzione persa (lista nella proposta).'],
 ['5 · Chiarezza','Ogni schermata dice dove sei, cosa vedi, cosa puoi fare. Nomi uguali ovunque, guida aggiornata.','Fai provare l’app a un amico senza spiegazioni.'],
 ['6 · Database in ordine','Un unico schema del database, modifiche numerate, funzioni inutili tolte.','Esegui i blocchi SQL indicati (uno per foglio); l’app va come prima.'],
 ['7 · Velocità','App sotto 700 KB, prima schermata in meno di 2 secondi, caricamento a pezzi.','L’app si apre e scorre più veloce.'],
 ['8 · Prove automatiche','A ogni proposta GitHub costruisce e prova l’app da solo.','Nella proposta compare una spunta verde.'],
 ['9 · Funzioni nuove','Presidi veri condivisi, pannello negozio, sponsor veri, pubblicazione negli store.','Le nuove funzioni, una alla volta.'],
 ['10 · Realtà aumentata','“Lente ZombieSafeHouse”: fotocamera a fumetto con etichette sulle case (vedi sezione 6).','Inquadri la strada e vedi tutto a fumetto.'],
],[30*mm,80*mm,60*mm])]
s+= [PageBreak(),Paragraph('5. Messaggi da incollare',H),Paragraph('Dalla Fase 2 in poi basta questo messaggio, cambiando il numero della fase:',P),code('''Esegui la Fase N della ROADMAP.md.
Alla fine: prove, build, pull request "Fase N — …" con, in italiano,
cosa cambia, cosa NON cambia e cosa devo controllare sul telefono
(massimo 5 punti). Se servono blocchi SQL, preparali e spiegami
passo passo come incollarli in Supabase (un foglio nuovo per blocco).''')]
s+= [Spacer(1,8),Paragraph('Per una correzione veloce, con foto:',P),code('''[allega la foto dello schermo]
Sul telefono vedo questo: <descrivi cosa non va>.
Correggi senza cambiare altro, prova e apri una pull request
con cosa devo controllare.''')]
s+= [Spacer(1,8),Paragraph('Se Claude Code chiede una conferma che non capisci:',P),code('''Spiegami in parole semplici cosa succede se dico sì e cosa se dico no.''')]
s+= [Spacer(1,8),box('<b>Regole che Claude Code conosce già</b> (sono nel file CLAUDE.md del progetto): privacy delle case e dei nomi, case abitate mai comprabili, premi in Mattoni decisi dal server, account separati sullo stesso telefono, formule uguali tra database e app, chiave secret di Supabase mai scritta, SQL sempre in un foglio nuovo.')]
s+= [PageBreak(),Paragraph('6. Realtà aumentata: si può fare?',H),Paragraph('<b>Sì, in due livelli.</b> Il primo si può fare subito nella PWA, sul browser dell’iPhone e di Android. Il secondo richiede l’app degli store.',P)]
s+= [Paragraph('Livello 1 · Nella PWA (fattibile ora)',H3)]
for x in ['<b>Tutto quello che inquadri diventa fumetto</b>: filtro in tempo reale sulla fotocamera con contorni neri spessi, colori a tinte piatte, retino a puntini e i colori di ZombieSafeHouse.',
          '<b>Etichette sopra gli edifici</b>, con GPS e bussola del telefono: le tue case, quelle degli alleati, sponsor, presidi. Per i superstiti che hanno scelto “Tutti”: nome, livello e Punteggio Superstite. Per le altre case: solo “Casa abitata”.',
          '<b>Zombie a fumetto</b> che camminano nell’inquadratura all’ora dell’orda.',
          '<b>Limite</b>: il GPS sbaglia di 5–20 metri e la bussola di 10–20 gradi, quindi le etichette “galleggiano” vicino agli edifici, non sono incollate ai muri.']:
    s.append(Paragraph(x,B,bulletText='•'))
s+= [Paragraph('Livello 2 · Nell’app degli store',H3)]
for x in ['Con ARKit (iPhone) e ARCore (Android) e le loro ancore geografiche: <b>case a fumetto in 3D allineate agli edifici veri</b>, fortificazioni disegnate sopra la casa reale inquadrata, zombie che escono dagli angoli delle strade.',
          'Si fa dopo la pubblicazione negli store (Fase 9).']:
    s.append(Paragraph(x,B,bulletText='•'))
s+= [Spacer(1,6),box('<b>Privacy, da non dimenticare.</b> Puntare la fotocamera su una casa e vedere chi ci abita è un rischio vero per le persone. Le informazioni su un superstite compaiono solo se lui ha scelto “Tutti”; per gli altri si vede “Casa abitata”. Nessuna foto viene salvata o inviata: tutto resta sul telefono.',colors.HexColor('#fff3b0'))]
s+= [Spacer(1,6),Paragraph('Quando arriviamo alla Fase 10, il messaggio per Claude Code è:',P),code('''Esegui la Fase 10A della ROADMAP.md (realtà aumentata nella PWA):
fotocamera con filtro fumetto in tempo reale, etichette GPS+bussola
con le regole di privacy, zombie all'ora dell'orda.
Prima mostrami un prototipo semplice da provare sul telefono.''')]
doc=SimpleDocTemplate('/mnt/user-data/outputs/ZombieSafeHouse_Guida_Claude_Code.pdf',pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=16*mm,bottomMargin=18*mm,title='ZombieSafeHouse · Guida Claude Code',author='INDZ')
doc.build(s,onFirstPage=foot,onLaterPages=foot)
print('ok')
