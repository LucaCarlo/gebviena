/**
 * Aggiorna marketingDescription (e shortDescription) sui 25 StoreProduct
 * importati da Excel con descrizioni lunghe in stile editoriale.
 *
 * Uso:
 *   npx tsx scripts/enrich-store-descriptions.ts [GROUP_NAME]
 *
 * Matching: lo script localizza ogni storeProduct tramite uno qualunque dei suoi
 * SKU Excel (più affidabile del nome della translation). Se rileva altri
 * storeProduct con la stessa translation name ma productId diverso, li
 * **disattiva** (isPublished=false sia su storeProduct sia su translation) per
 * evitare duplicati nello store pubblico.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface ProductCopy {
  group: string;       // chiave esatta del Raggruppamento Excel
  skus: string[];      // SKU (codici Excel) delle varianti di quel raggruppamento — usati per il match
  short: string;       // 1-2 frasi, mostrato nei listing e in cima alla pagina
  long: string;        // testo lungo per la sezione Descrizione (può contenere markdown leggero)
}

const COPY: ProductCopy[] = [
  {
    skus: ["CHVALELGN"],
    group: "ARCH CLOTHES VALET",
    short: "Servomuto in legno di faggio dal disegno arcuato essenziale: un complemento discreto e raffinato per la zona notte, le cabine armadio e gli spazi hospitality.",
    long: `**ARCH CLOTHES VALET** è il servomuto di Gebrueder Thonet Vienna che porta nella zona notte la stessa pulizia formale che da oltre un secolo distingue gli arredi in faggio curvato. Una sola arcata in legno massello disegna l'intera struttura, sostenendo gambe, traversa porta-pantaloni e barra superiore senza giunzioni evidenti: il risultato è una silhouette continua, leggera, quasi grafica.

La costruzione segue il metodo Thonet della curvatura a vapore, applicato a un solo arco che riduce al minimo i nodi visivi e mantiene la stabilità anche con un abito completo appoggiato. Il faggio europeo certificato FSC garantisce resistenza e tenuta della forma nel tempo.

Disponibile su richiesta in finitura personalizzata: laccato opaco nei colori della palette GTV, oppure verniciato nella tinta scelta dal cliente per integrarsi a una camera o a una suite hospitality. La finitura standard naturale ne esalta la venatura del faggio.

**Ideale per:** camere da letto, suite, cabine armadio, ingressi formali, hospitality di alto livello.`,
  },

  {
    skus: ["SDCAFELGN","SDCAFELTES"],
    group: "CAFESTUHL",
    short: "Sedia CAFESTUHL in faggio curvato con seduta in multistrato o imbottita: le linee morbide e la struttura leggera definiscono un design essenziale e contemporaneo, ideale per ambienti dining e progetti contract.",
    long: `**CAFESTUHL** raccoglie l'eredità della sedia da caffè viennese — uno dei riferimenti fondativi del design moderno — e la rielabora in chiave attuale. Il telaio in faggio curvato a vapore conserva la geometria della tradizione bistrot, mentre lo schienale sagomato e la seduta (in multistrato o imbottita) ne aggiornano l'ergonomia.

La leggerezza è una scelta progettuale: ogni componente è dimensionato per offrire la massima resistenza con il minimo ingombro visivo, una qualità che rende CAFESTUHL impilabile e ideale anche per spazi pubblici ad alto turnover. La produzione in faggio europeo FSC mantiene tutta la mano d'opera artigianale del processo Thonet, dalla curvatura al fissaggio dei dettagli.

Su richiesta la sedia è disponibile in qualunque colore della palette RAL/NCS: opaco, satinato o lucido, con finitura UV resistente per uso intensivo. La versione imbottita può essere rivestita nei tessuti della collezione GTV o in stoffa fornita dal cliente (COM).

**Ideale per:** ristoranti, caffetterie, hotel, sale conferenze, ambienti dining residenziali e spazi contract dove servono robustezza e identità.`,
  },

  {
    skus: ["SDCZECLGN","SDCZECTES","PTCZECLGN","PTCZECTES"],
    group: "CZECH",
    short: "Sedia CZECH in faggio curvato, ispirata alla tradizione boema del bentwood: linee asciutte e schienale a doghe, struttura leggera e impilabile per dining e contract.",
    long: `**CZECH** affonda le radici nella scuola boema del bentwood, la stessa che alla fine dell'Ottocento esportò la tecnica della curvatura a vapore in tutto il mondo. La sedia recupera la silhouette di archetipo — gambe affusolate, schienale a doghe verticali, traversa di rinforzo posteriore — e la riveste con proporzioni contemporanee.

Il telaio è interamente in faggio massello curvato; le doghe dello schienale sono lavorate singolarmente e fissate con tenuta meccanica per garantire flessibilità e tenuta nel tempo. La seduta, in multistrato sagomato, accompagna la postura con un leggero invito.

CZECH è progettata per essere impilabile e si presta a soluzioni di forte densità senza rinunciare al carattere. Su richiesta è verniciata in qualunque tonalità: dalle finiture opache della palette GTV ai colori personalizzati con campione fornito dal cliente.

**Ideale per:** ristoranti, brasserie, bistrot, sale meeting, hospitality, residenze con stile mid-century o classico contemporaneo.`,
  },

  {
    skus: ["CML160LGN","CML200LGN","CML250LGN"],
    group: "LADDER",
    short: "Sedia LADDER con schienale a pioli orizzontali (ladder back) in faggio curvato: linguaggio essenziale ispirato al design Shaker, perfetto per ambienti dining sobri e contemporanei.",
    long: `**LADDER** prende il nome dal suo elemento distintivo: lo schienale a pioli orizzontali — il classico *ladder back* della tradizione anglosassone e Shaker — qui reinterpretato con la grammatica del faggio curvato a vapore. Il risultato è una sedia di grande riconoscibilità grafica, leggera al colpo d'occhio e robusta nell'uso.

Il telaio è in faggio massello europeo FSC, lavorato con la tecnica della curvatura che permette di disegnare gambe e schienale con un'unica continuità formale. I pioli orizzontali sono inseriti a coda di rondine e bloccati con tenuta meccanica, in modo da assorbire le sollecitazioni senza cedimenti.

La sedia è disponibile con seduta in legno (multistrato sagomato) oppure con seduta paglia di Vienna intrecciata a mano — quest'ultima opzione esalta la matrice artigianale e si presta particolarmente alle finiture chiare. Su richiesta LADDER è verniciata in qualunque colore della palette GTV o in tinta personalizzata.

**Ideale per:** sale da pranzo, country house, ristoranti con identità mediterranea o nord-europea, ambienti hospitality di carattere.`,
  },

  {
    skus: ["PLLOOPTES","PTLOOPTES"],
    group: "LOOP INDIA MAHDAVI",
    short: "Sedia LOOP disegnata da India Mahdavi: nastro continuo di faggio curvato che definisce schienale e seduta in un unico gesto, per spazi dining e bar di forte impronta autoriale.",
    long: `**LOOP** porta la firma di **India Mahdavi**, una delle voci più riconoscibili del design contemporaneo internazionale. La sedia trasforma il principio del bentwood in un nastro continuo: un'unica linea curva che parte dalle gambe posteriori, sale a comporre lo schienale e ridiscende fino al traverso anteriore, generando un *loop* perfetto. Da qui il nome.

Il telaio è in faggio europeo FSC curvato a vapore secondo il metodo Thonet, lavorato per esaltare la continuità della curva e ridurre al minimo i giunti visibili. La seduta è in multistrato sagomato (versione legno) o imbottita con rivestimento personalizzabile (versione COM).

LOOP è pensata per ambienti che richiedono identità e accoglienza insieme: ristoranti d'autore, hotel di design, lobby curate. Le finiture verniciate, disponibili in tutta la palette RAL/NCS, vengono spesso scelte in tonalità sature — rosa cipria, verde salvia, terracotta — coerenti con il linguaggio cromatico di India Mahdavi.

**Ideale per:** ristoranti d'autore, hotel di design, lounge, residenze contemporanee, progetti di interior dove il colore è parte integrante del concept.`,
  },

  {
    skus: ["SDMAGILGN"],
    group: "MAGISTRETTI 0301",
    short: "Sedia 0301 disegnata da Vico Magistretti per Gebrueder Thonet Vienna: rigore razionalista italiano sposato alla tradizione del bentwood viennese.",
    long: `La **0301** è una delle ultime collaborazioni firmate da **Vico Magistretti** per Gebrueder Thonet Vienna. Magistretti — uno dei nomi cardine del design italiano del Novecento — porta in questo progetto la sua cifra più riconoscibile: rigore costruttivo, sottrazione formale, attenzione al dettaglio strutturale.

La sedia è interamente in faggio massello curvato a vapore, con schienale e seduta che dialogano in un equilibrio di pieni e vuoti calibrato al millimetro. Il telaio è dimensionato per resistere a uso intensivo senza appesantirsi visivamente; la seduta in multistrato sagomato accompagna la postura con un'inclinazione studiata per il comfort prolungato.

La 0301 è disponibile su richiesta verniciata nei colori della palette GTV (opaca, satinata o lucida) oppure in tinta personalizzata per progetti contract di alto livello. La finitura naturale è altrettanto raffinata e mette in evidenza la fibra del faggio.

**Ideale per:** ambienti contract di rappresentanza, sale meeting, ristoranti d'autore, residenze private dove la sedia ha il valore di un piccolo manifesto progettuale.`,
  },

  {
    skus: ["CAMAJOPGL"],
    group: "MAJORDOMO",
    short: "Servomuto MAJORDOMO in faggio curvato: linguaggio sobrio e gerarchico, pensato per le suite e gli spazi di accoglienza più curati.",
    long: `**MAJORDOMO** è il servomuto signature di Gebrueder Thonet Vienna: un piccolo arredo dal nome programmatico, pensato per accompagnare il rituale del vestirsi nelle suite, nelle cabine armadio e negli spazi di accoglienza più curati.

La struttura è interamente in faggio massello europeo FSC, lavorato con la tecnica della curvatura a vapore che permette di disegnare le gambe con una linea continua e raccordare ogni elemento senza rotture visive. La barra porta-abito è dimensionata per sostenere completi pesanti senza flessione; il traverso porta-pantaloni include un dettaglio in legno tornito che mantiene la stoffa in piano.

Su richiesta MAJORDOMO è verniciato in qualunque colore della palette RAL/NCS per integrarsi all'arredo della camera o della suite. Le finiture standard naturale e nera opaca sono quelle preferite negli interni hospitality di alto livello.

**Ideale per:** suite alberghiere, ville e residenze private, cabine armadio, ingressi formali, ambienti dove l'ordine quotidiano fa parte dell'esperienza.`,
  },

  {
    skus: ["CNMOSAPGC"],
    group: "MOS CABINET",
    short: "Mobile contenitore della collezione MOS: faggio curvato a vista sui montanti laterali, ante cieche e ripiani interni regolabili — un volume contenuto e iconico.",
    long: `**MOS CABINET** è il volume contenitore della collezione **MOS**, una famiglia coordinata che condivide lo stesso codice grafico: montanti laterali in faggio curvato a vista, sezioni geometriche essenziali, dettagli costruttivi esibiti come elementi decorativi.

Il mobile è strutturato attorno a una cassa lignea irrigidita dai montanti curvati che proseguono fino al pavimento, sostenendo l'intero volume e disegnando le fiancate. Le ante cieche aprono su un vano interno suddiviso da ripiani regolabili in altezza; la ferramenta è a chiusura ammortizzata.

Tutte le superfici sono finite con la massima cura: bordi tornito-lavorati, raccordi a 45° dove serve, viti nascoste. Su richiesta MOS CABINET è verniciato in qualunque colore della palette GTV, mantenendo a vista la cornice in faggio naturale che diventa così la firma cromatica della collezione.

**Ideale per:** sale da pranzo, ingressi, hotel, uffici di rappresentanza, ambienti residenziali in cui il contenitore deve dialogare con sedute e tavoli senza prendere il sopravvento.`,
  },

  {
    skus: ["CNMOSGPGC"],
    group: "MOS CONSOLE",
    short: "Consolle MOS in faggio curvato: piano sottile sospeso tra due montanti continui, presenza grafica forte per ingressi e zone di passaggio.",
    long: `**MOS CONSOLE** porta il codice grafico della collezione MOS sull'archetipo della consolle: un piano orizzontale leggero, sostenuto da due montanti laterali in faggio curvato a vapore che proseguono dal pavimento fino alla quota del top, raccordandosi senza giunzioni visibili.

Il piano è in legno multistrato impiallacciato faggio, dimensionato per offrire una superficie utile coerente (chiavi, libri, oggetti di passaggio) senza appesantire la composizione. La struttura è alleggerita visivamente da una traversa di rinforzo posizionata a metà altezza, che irrigidisce il telaio e disegna la silhouette laterale.

Su richiesta MOS CONSOLE è verniciato in qualunque tinta della palette RAL/NCS, oppure mantenuto nella finitura naturale che valorizza la grafica del faggio. È spesso scelto come elemento di accoglienza in ingressi pubblici o hospitality.

**Ideale per:** ingressi residenziali, lobby di hotel, corridoi di passaggio, dietro-divano nei living open-space, sale di rappresentanza.`,
  },

  {
    skus: ["LBMOSGPGL"],
    group: "MOS BOOKCASE",
    short: "Libreria modulare della collezione MOS: montanti continui in faggio curvato e ripiani aperti, una struttura grafica leggera per organizzare libri e oggetti in maniera ariosa.",
    long: `**MOS BOOKCASE** è la libreria della collezione MOS: una struttura aperta dove i ripiani orizzontali sono incastrati nei due montanti laterali in faggio curvato a vapore, che disegnano la silhouette verticale del mobile senza interruzioni.

La leggerezza visiva è la cifra del progetto: i ripiani sono sottili, le sezioni dei montanti calibrate, l'intera composizione respira nello spazio. La libreria nasce modulare — può affiancarsi a sé stessa per comporre pareti più ampie — e tutti i ripiani sono dimensionati per sostenere libri rilegati senza flessione.

Su richiesta la struttura è disponibile verniciata in colore della palette GTV; la versione bicolore (montanti in tinta + ripiani naturali, o viceversa) è frequente nei progetti residenziali di carattere.

**Ideale per:** studi, biblioteche domestiche, living, hospitality di alto livello, uffici dirigenziali, sale lettura di hotel-boutique.`,
  },

  {
    skus: ["PCMOSGTEP"],
    group: "MOS BENCH (senza cuscino)",
    short: "Panca MOS lineare senza cuscino: seduta lignea sospesa tra due montanti curvati, profilo grafico e robusto per ingressi, zone di passaggio e dining contract.",
    long: `**MOS BENCH** nella versione **senza cuscino** è l'archetipo della panca lignea: una seduta lineare in legno multistrato impiallacciato faggio, sostenuta dai due montanti laterali in faggio curvato a vapore della collezione MOS. Niente imbottiture, niente decorazioni — solo il rapporto tra il piano orizzontale e i due archi laterali.

La struttura è dimensionata per uso intensivo: la seduta è rinforzata da una traversa centrale che impedisce flessioni, e i montanti curvati distribuiscono il carico sui quattro punti d'appoggio. La finitura naturale esalta la fibra del faggio, mentre su richiesta la panca è verniciata in qualunque colore della palette RAL/NCS.

Si presta agli ingressi pubblici, alle zone di attesa e alle composizioni dining in coppia con il tavolo MOS, dove la geometria condivisa crea un dialogo coerente.

**Ideale per:** ingressi pubblici, ambienti contract, sale d'attesa, dining su tavoli lunghi, hospitality, residenze open-space.`,
  },

  {
    skus: ["PCMOSGTEP"],
    group: "MOS BENCH (con cuscino corto)",
    short: "Panca MOS con cuscino corto imbottito: la geometria lineare della collezione MOS arricchita da un cuscino centrale per comfort prolungato e maggiore presenza visiva.",
    long: `**MOS BENCH con cuscino corto** è l'evoluzione confortevole della panca MOS. La seduta lignea è arricchita da un cuscino centrale imbottito in poliuretano espanso a densità differenziata, dimensionato per occupare la porzione centrale della panca lasciando a vista i bordi in legno.

Il cuscino è sfoderabile e rivestibile in qualunque tessuto della collezione GTV oppure in stoffa fornita dal cliente (COM): pelle, lino, velluto, microfibra contract per uso intensivo. La forma rettangolare con bordi vivi è cucita a mano e ribadita con doppio impuntura per garantire una linea netta nel tempo.

La struttura sottostante è la stessa della versione lineare: faggio curvato a vapore, traversa di rinforzo, finitura naturale o verniciata su richiesta. Il cuscino corto è la scelta preferita quando la panca ha funzione doppia (seduta + appoggio).

**Ideale per:** ingressi domestici, fondo letto, zone di accoglienza in hospitality, sale d'attesa di rappresentanza, ambienti misti dove serve sia seduta che superficie d'appoggio.`,
  },

  {
    skus: ["PCMOSGTEP"],
    group: "MOS BENCH (con cuscino lungo)",
    short: "Panca MOS con cuscino lungo imbottito: l'intera seduta è rivestita per il massimo comfort, mantenendo a vista solo i montanti curvati laterali della collezione MOS.",
    long: `**MOS BENCH con cuscino lungo** è la versione più morbida della collezione MOS. L'intera seduta è coperta da un cuscino imbottito che occupa la lunghezza della panca, lasciando a vista soltanto i due montanti curvati laterali in faggio — il segno grafico distintivo della collezione.

L'imbottitura è in poliuretano espanso a densità differenziata, con strato superiore in fiocco siliconato per una mano accogliente. La fodera è sfoderabile e cucita a mano: il rivestimento si sceglie nella collezione tessuti GTV (pelle, lino, velluto, microfibra) oppure in stoffa fornita dal cliente (COM) per progetti contract con palette dedicate.

La struttura in faggio curvato a vapore è la stessa della collezione MOS, con traversa di rinforzo centrale e finitura personalizzabile su richiesta. Il cuscino lungo trasforma la panca in una piccola seduta lounge che si presta a dialogare con divani e poltrone.

**Ideale per:** lobby di hotel, sale d'attesa di rappresentanza, fondo letto in suite, zone living open-space, ambienti contract dove la seduta deve essere accogliente e visivamente coerente.`,
  },

  {
    skus: ["TBMOSGLGP"],
    group: "MOS SIDE TABLE",
    short: "Tavolino MOS in faggio curvato: piano tondo o quadrato sostenuto dai montanti curvati della collezione MOS, una presenza grafica essenziale per accanto-divano e camera da letto.",
    long: `**MOS SIDE TABLE** è il complemento minimo della collezione MOS: un tavolino accanto-divano (o comodino) che riporta su scala ridotta il codice della famiglia — montanti in faggio curvato che disegnano la struttura senza giunture visibili.

Il piano è disponibile in versione tonda o quadrata, in legno multistrato impiallacciato faggio. La struttura sottostante alleggerisce il volume e mantiene il tavolino visivamente leggero, anche affiancato a divani o letti di grandi dimensioni. L'altezza è studiata per dialogare con i braccioli o con i piani di un letto contemporaneo.

Su richiesta il tavolino è verniciato in qualunque tinta della palette RAL/NCS; la versione bicolore (piano in tinta + montanti naturali, o viceversa) è frequente nei progetti residenziali di carattere.

**Ideale per:** accanto-divano in zona living, comodino, ingressi, sale lettura, hospitality, residenze dove il piccolo arredo deve avere lo stesso livello formale delle sedute principali.`,
  },

  {
    skus: ["SDN014LGN","SDN014PGL","SDN014TES"],
    group: "N.14",
    short: "L'iconica sedia N.14 di Michael Thonet (1859): il primo prodotto industriale della storia, ancora oggi prodotta in faggio curvato a vapore secondo il metodo originale.",
    long: `La **N.14** non è soltanto una sedia: è il primo arredo prodotto industrialmente in serie nella storia del design. Disegnata da **Michael Thonet** nel 1859 e divenuta dal 1867 il prodotto più diffuso al mondo, la N.14 (oggi anche conosciuta come 214) ha venduto oltre 50 milioni di esemplari ed è esposta nelle collezioni permanenti dei principali musei di design — dal MoMA di New York al Vitra Design Museum.

Il principio costruttivo è ancora quello originale: sei pezzi di faggio europeo FSC curvati a vapore, dieci viti, due dadi. Niente collanti strutturali, niente colpi di chiodo: la sedia si assembla in pochi minuti e si smonta per il trasporto in piano, una soluzione che nell'Ottocento rivoluzionò la logistica dell'arredo.

La produzione contemporanea di Gebrueder Thonet Vienna preserva integralmente il metodo: piegatura del legno verde in stampi di ghisa, essiccazione lenta, lavorazione manuale dei dettagli. La seduta è in paglia di Vienna intrecciata a mano oppure in multistrato sagomato. Su richiesta la N.14 è verniciata nei colori della palette GTV o in tinta personalizzata.

**Ideale per:** ristoranti, caffetterie, ambienti contract con identità storica, residenze classiche e contemporanee, sale d'attesa, ovunque sia richiesto un riferimento iconico al design industriale moderno.`,
  },

  {
    skus: ["SDN018LGN","SDN018TES","SAN018LGN","SAN018TES"],
    group: "N.18",
    short: "Sedia N.18 della collezione classica Thonet: faggio curvato a vapore, schienale tondo con doppio cerchio interno — un riferimento del design viennese di fine Ottocento.",
    long: `La **N.18** è una delle sedie più rappresentative della collezione classica di Gebrueder Thonet Vienna. Sviluppata sul finire dell'Ottocento come variante della famiglia N.14, si distingue per lo schienale tondo che incorpora un secondo cerchio concentrico — un dettaglio geometrico che è diventato la sua firma e che la rende immediatamente riconoscibile nelle fotografie d'epoca dei caffè viennesi.

La costruzione segue integralmente il metodo Thonet: faggio europeo FSC curvato a vapore, sei elementi principali, assemblaggio meccanico senza colle strutturali. La seduta è in paglia di Vienna intrecciata a mano (la versione *classica*) oppure in multistrato sagomato (versione *contract*); l'intreccio in paglia è realizzato a mano da artigiani specializzati e ogni sedia richiede diverse ore di lavorazione.

La N.18 si presta naturalmente alla finitura naturale, che esalta la fibra del faggio, ma su richiesta è disponibile verniciata in qualunque colore della palette RAL/NCS — comprese le finiture nere lucide tipiche dei caffè storici e le tonalità sature dei progetti di interior contemporaneo.

**Ideale per:** caffetterie, ristoranti, ambienti contract di alto livello, sale da pranzo classiche e contemporanee, residenze con vocazione mid-century.`,
  },

  {
    skus: ["PLN200PGL","PLN200TES"],
    group: "N.200",
    short: "Sedia N.200 con braccioli, faggio curvato a vapore: una poltroncina compatta che porta il linguaggio bentwood nei progetti dove serve maggior comfort.",
    long: `La **N.200** è la versione con braccioli della famiglia bentwood Thonet. Pensata per chi cerca il comfort di una poltroncina senza rinunciare alla leggerezza del faggio curvato, la sedia integra i braccioli nella stessa logica costruttiva del telaio: un unico arco continuo che parte dallo schienale e ridiscende ai poggia-braccia.

Il telaio è in faggio europeo FSC curvato a vapore secondo il metodo originale. La forma dei braccioli è studiata per accogliere l'appoggio dell'avambraccio senza limitare la libertà di seduta; lo schienale ad anello segue la postura dorsale con un'inclinazione calibrata.

La seduta è disponibile in paglia di Vienna intrecciata a mano oppure in multistrato sagomato (versione contract). Su richiesta la N.200 è verniciata in qualunque colore della palette GTV, e nella tonalità nera opaca o lucida assume il carattere delle poltroncine da caffè storiche del primo Novecento.

**Ideale per:** scrivanie, ambienti meeting di rappresentanza, ristoranti d'autore, hospitality, residenze contemporanee dove serve una seduta secondaria di carattere.`,
  },

  {
    skus: ["PT0811PGL","PT0811TES","SD0811PGL","SD0811TES","SA0811PGL","SA0811TES","SA0811TE2"],
    group: "N.811",
    short: "La leggendaria sedia 811 disegnata da Josef Hoffmann nel 1925: telaio in faggio curvato, schienale a doghe radiali, una sintesi di Secessione viennese e Bauhaus.",
    long: `La **811** è una delle sedie più importanti del Novecento europeo. Disegnata da **Josef Hoffmann** nel 1925, è la sintesi di due grandi correnti del design: il rigore geometrico della Wiener Werkstätte (di cui Hoffmann fu fondatore) e la chiarezza costruttiva del Bauhaus. Lo schienale a doghe radiali — il segno più riconoscibile della 811 — è insieme un elemento strutturale e una scelta grafica.

La costruzione segue il metodo del bentwood: faggio europeo FSC curvato a vapore, doghe inserite singolarmente nella struttura del telaio e fissate con tenuta meccanica. La seduta è in paglia di Vienna intrecciata a mano (la versione fedele all'originale) oppure in multistrato sagomato. La sedia è impilabile, una qualità che la rende ideale anche per ambienti contract.

Su richiesta la 811 è verniciata in qualunque tinta della palette RAL/NCS. Le finiture nere e bianche restituiscono fedelmente l'estetica originale Hoffmann; le tinte sature contemporanee — bordeaux, ottanio, ocra — sono spesso scelte nei progetti di restyling di sale storiche.

**Ideale per:** ambienti di rappresentanza, ristoranti d'autore, sale meeting di high-design, hospitality di alto livello, residenze con vocazione classica modernista, collezioni di design.`,
  },

  {
    skus: ["TVPEEALGN","TVPEEBLGN"],
    group: "PEERS",
    short: "Sedia PEERS in faggio curvato: linguaggio essenziale, telaio leggero e schienale curvo continuo — pensata per dialogare in coppia attorno a tavoli dining contemporanei.",
    long: `**PEERS** è una sedia pensata per stare in coppia, in serie, in famiglia: il nome stesso lo dichiara. Il telaio in faggio curvato a vapore è ridotto all'essenziale — quattro gambe, un sedile, uno schienale curvo continuo — e ogni dettaglio è studiato perché la sedia funzioni in dialogo con i propri simili attorno a un tavolo.

La curvatura dello schienale è calibrata per accogliere la postura della schiena con un appoggio dolce ma fermo; la seduta in multistrato sagomato (oppure imbottita, su richiesta) accompagna l'angolo. La leggerezza del telaio rende PEERS impilabile, una qualità apprezzata negli spazi pubblici ad alta densità.

Su richiesta è verniciata in qualunque colore della palette RAL/NCS. Le tinte naturali del faggio, i bianchi opachi e i grigi caldi sono le scelte più frequenti per i progetti residenziali; le tonalità sature funzionano negli ambienti contract dove la sedia ha valore identitario.

**Ideale per:** ambienti dining residenziali, ristoranti, sale meeting, spazi contract, residenze contemporanee dove la sedia deve essere insieme efficiente e riconoscibile.`,
  },

  {
    skus: ["SDRADELGN"],
    group: "RADETZKY",
    short: "Sedia RADETZKY in faggio curvato, omaggio alla tradizione asburgica viennese: schienale ad anello e seduta tonda, presenza scenica per ambienti di alto livello.",
    long: `**RADETZKY** porta nel nome l'eco della Vienna asburgica e nella forma la grammatica della Secessione viennese. La sedia è caratterizzata dallo schienale ad anello — una grande curva continua di faggio che racchiude la zona dorsale e arriva fino alla seduta tonda — e da una geometria di gambe affusolate che ne accentua la verticalità.

La costruzione segue il metodo originale Thonet: faggio europeo FSC curvato a vapore in stampi di ghisa, assemblaggio meccanico, lavorazione manuale dei dettagli. La seduta è in multistrato sagomato (versione standard) oppure in paglia di Vienna intrecciata a mano (versione classica), con possibilità di imbottitura su richiesta per ambienti contract di maggiore comfort.

Su richiesta RADETZKY è verniciata in qualunque tinta della palette GTV: la finitura nera lucida ne accentua il carattere scenico, le tonalità chiare la rendono adatta a interni residenziali di carattere classico.

**Ideale per:** sale da pranzo di rappresentanza, ristoranti d'autore, ambienti hospitality di alto livello, residenze con vocazione classica, sale lettura, librerie di prestigio.`,
  },

  {
    skus: ["SDSOLDTES"],
    group: "SOLDEN",
    short: "Sedia SOLDEN in faggio curvato: telaio robusto e schienale ergonomico, pensata per uso intensivo in ambienti contract e dining ad alta frequenza.",
    long: `**SOLDEN** nasce per gli ambienti che chiedono prestazioni: ristoranti ad alto turnover, caffetterie, mense aziendali, hospitality di volume. Il telaio in faggio curvato a vapore è dimensionato per sopportare uso continuo senza cedimenti, con sezioni leggermente più generose rispetto alle sedie da residenza.

Lo schienale è sagomato secondo uno studio ergonomico che accompagna la postura anche nelle sedute prolungate; la seduta in multistrato è leggermente concava per migliorare il comfort. Il telaio è impilabile, una qualità necessaria nei contesti dove la flessibilità degli spazi è un valore.

Tutta la lavorazione resta fedele al metodo Thonet: curvatura del faggio europeo FSC, assemblaggio meccanico, finitura manuale. Su richiesta SOLDEN è verniciata in qualunque colore della palette RAL/NCS, comprese le finiture UV ad alta resistenza per ambienti esterni coperti.

**Ideale per:** ristoranti, brasserie, mense aziendali, ambienti contract con uso intensivo, hospitality di volume, dehors coperti, sale conferenza.`,
  },

  {
    skus: ["SDSUGILGN","SDSUGITE2","PTSUGITE2","PTSUGILGN"],
    group: "SUGILOO",
    short: "Sedia SUGILOO con sedile in paglia di Vienna intrecciata: telaio in faggio curvato, schienale arcuato, una sintesi calda e leggera per dining e living contemporanei.",
    long: `**SUGILOO** mette in dialogo due elementi della tradizione viennese: la curvatura del faggio (il *bentwood*) e l'intreccio della paglia di Vienna. Lo schienale arcuato e le gambe affusolate sono in faggio europeo FSC curvato a vapore; la seduta tonda è in paglia di Vienna intrecciata a mano da artigiani specializzati, con un trama esagonale che è diventata uno dei marchi del design viennese.

L'intreccio richiede diverse ore di lavorazione per ogni sedia ed è realizzato a telaio aperto: la trama è visibile dal sotto, contribuendo alla leggerezza visiva e alla traspirazione della seduta. La paglia di Vienna è naturale e con il tempo sviluppa una patina dorata che valorizza il valore artigianale del prodotto.

Su richiesta SUGILOO è verniciata in qualunque tinta della palette RAL/NCS sul telaio in faggio, mentre la paglia rimane nella sua finitura naturale. La versione interamente naturale è la più richiesta per interni residenziali di carattere classico o mid-century.

**Ideale per:** sale da pranzo, ristoranti d'autore, residenze contemporanee con vocazione mediterranea o nord-europea, hospitality di alto livello, sale lettura.`,
  },

  {
    skus: ["SATRIOLGN","SATRIOTES","SBTRIOLGN","SBTRIOTES","SMTRIOLGN","SMTRIOTES"],
    group: "TRIO",
    short: "Sgabello TRIO in faggio curvato: tre gambe disposte a triangolo per stabilità e leggerezza visiva — sintesi essenziale per bancone bar, cucina, contract.",
    long: `**TRIO** porta il principio del bentwood viennese sull'archetipo dello sgabello a tre gambe. La struttura triangolare è insieme una scelta estetica — le tre gambe affusolate disegnano una silhouette grafica e leggera — e una soluzione di stabilità: il triangolo è la figura geometrica più rigida e distribuisce il peso uniformemente su superfici irregolari.

Il telaio è in faggio europeo FSC curvato a vapore secondo il metodo Thonet originale. Le tre gambe sono raccordate alla seduta tonda da un anello in legno curvato che funge anche da poggiapiedi all'altezza standard. La seduta è in multistrato sagomato; su richiesta è disponibile imbottita.

TRIO è impilabile e si presta a soluzioni di forte densità nei locali pubblici. Su richiesta è verniciato in qualunque tinta della palette GTV — le finiture sature (rosso, verde bosco, blu notte) sono frequenti nei progetti di interior contemporaneo dove lo sgabello ha valore identitario.

**Ideale per:** bancone bar, isola cucina domestica, controsoffitti contract, dehors coperti, ambienti pubblici di alto traffico, residenze con cucina open-space.`,
  },

  {
    skus: ["SAV144LGN","SAV144PGL","SAV144TES","SBV144LGN","SBV144PGL","SBV144TES"],
    group: "VIENNA 144",
    short: "Sgabello alto VIENNA 144 in faggio curvato: profilo essenziale e altezza bancone bar, un complemento versatile per cucine domestiche e ambienti professionali.",
    long: `**VIENNA 144** porta nel nome la città-laboratorio del bentwood e il numero che lo identifica nella collezione classica di Gebrueder Thonet Vienna. È uno sgabello alto, dimensionato per i banconi (altezza seduta standard 75 cm), con la stessa cura costruttiva delle sedie storiche da caffè.

Il telaio è in faggio europeo FSC curvato a vapore: quattro gambe affusolate, un anello poggiapiedi all'altezza canonica, una seduta tonda in legno multistrato sagomato. La leggerezza è il principio di progetto — lo sgabello deve potersi spostare con una mano sola — ma la struttura è dimensionata per resistere a uso continuo.

Su richiesta VIENNA 144 è disponibile in finitura verniciata in qualunque colore della palette RAL/NCS. È spesso scelto in più tonalità per comporre composizioni multicolor sui banconi di cucine domestiche e bar contemporanei.

**Ideale per:** banconi bar, isole cucina domestiche, dehors coperti, ambienti contract con uso quotidiano, hospitality, controsoffitti in spazi pubblici.`,
  },

  {
    skus: ["SDYOUCLGN"],
    group: "YOU CHAIR",
    short: "Sedia YOU impilabile con struttura in faggio curvato e arco di rinforzo continuo: design essenziale, ottima impilabilità e presenza grafica leggera per il contract.",
    long: `**YOU CHAIR** è la sintesi contemporanea di tre qualità che Gebrueder Thonet Vienna persegue da oltre un secolo: leggerezza, robustezza, impilabilità. La struttura in faggio europeo FSC curvato a vapore è alleggerita all'essenziale; un arco di rinforzo continuo collega le gambe e funge insieme da elemento strutturale e da firma grafica.

L'impilabilità è una qualità centrale del progetto: la sedia è dimensionata perché il sedile di una si appoggi sul telaio di quella sottostante senza danneggiare la finitura, una soluzione fondamentale negli ambienti contract dove la flessibilità degli spazi è un valore. Le pile possono raggiungere 6-8 sedie senza compromettere la stabilità.

La seduta è in multistrato sagomato (versione standard) oppure imbottita su richiesta. Tutte le verniciature della palette RAL/NCS sono disponibili, con finiture UV resistenti per uso intensivo. La versione naturale resta la più richiesta nei progetti residenziali.

**Ideale per:** sale meeting, sale conferenza, ristoranti, hospitality, sale eventi, ambienti contract dove la sedia deve poter scomparire o ricomparire in funzione delle attività.`,
  },
];

function makeLong(p: ProductCopy): string {
  return p.long.trim();
}

function makeShort(p: ProductCopy): string {
  return p.short.trim();
}

/**
 * Per il raggruppamento p, trova lo storeProduct "canonical" (quello che contiene
 * almeno una delle varianti con SKU in p.skus). Più affidabile del match per name.
 */
async function findCanonicalStoreProduct(p: ProductCopy): Promise<{ id: string; productId: string } | null> {
  const variants = await prisma.storeProductVariant.findMany({
    where: { sku: { in: p.skus.map((s) => s.slice(0, 64)) } },
    select: { storeProductId: true, storeProduct: { select: { id: true, productId: true } } },
  });
  if (variants.length === 0) return null;
  // Conta storeProduct id più frequente (in caso multipli)
  const tally = new Map<string, { count: number; productId: string }>();
  for (const v of variants) {
    const k = v.storeProductId;
    const t = tally.get(k);
    if (t) t.count++;
    else tally.set(k, { count: 1, productId: v.storeProduct.productId });
  }
  let best: { id: string; productId: string; count: number } | null = null;
  for (const [id, { count, productId }] of Array.from(tally.entries())) {
    if (!best || count > best.count) best = { id, productId, count };
  }
  return best ? { id: best.id, productId: best.productId } : null;
}

async function main() {
  const onlyGroup = process.argv[2] || null;
  const targets = onlyGroup ? COPY.filter((c) => c.group === onlyGroup) : COPY;
  if (onlyGroup && targets.length === 0) {
    console.error(`Raggruppamento "${onlyGroup}" non in catalogo. Disponibili:`);
    console.error(COPY.map((c) => "  - " + c.group).join("\n"));
    process.exit(1);
  }

  let updated = 0;
  let notFound = 0;
  let duplicatesDisabled = 0;

  for (const p of targets) {
    const canonical = await findCanonicalStoreProduct(p);
    if (!canonical) {
      console.warn(`✗ ${p.group}: nessuna variant con SKU ${p.skus.join(",")} trovata — skip`);
      notFound++;
      continue;
    }

    // Upsert translation IT per il canonical
    const tr = await prisma.storeProductTranslation.findUnique({
      where: { storeProductId_languageCode: { storeProductId: canonical.id, languageCode: "it" } },
    });
    if (tr) {
      await prisma.storeProductTranslation.update({
        where: { id: tr.id },
        data: {
          name: p.group,
          shortDescription: makeShort(p),
          marketingDescription: makeLong(p),
          status: "published",
          isPublished: true,
        },
      });
    } else {
      // Crea translation con slug univoco
      const slugBase = p.group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      let slug = slugBase;
      let i = 2;
      while (await prisma.storeProductTranslation.findFirst({ where: { languageCode: "it", slug } })) {
        slug = `${slugBase}-${i++}`;
      }
      await prisma.storeProductTranslation.create({
        data: {
          storeProductId: canonical.id,
          languageCode: "it",
          name: p.group,
          slug,
          shortDescription: makeShort(p),
          marketingDescription: makeLong(p),
          status: "published",
          isPublished: true,
        },
      });
    }
    // Assicura storeProduct pubblicato
    await prisma.storeProduct.update({
      where: { id: canonical.id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    // Disattiva eventuali OTHER storeProduct con stessa translation name ma productId diverso
    // (sono duplicati legacy creati da seed/import precedenti)
    const otherTrs = await prisma.storeProductTranslation.findMany({
      where: {
        name: p.group,
        languageCode: "it",
        storeProductId: { not: canonical.id },
      },
      select: { id: true, storeProductId: true },
    });
    for (const ot of otherTrs) {
      await prisma.storeProductTranslation.update({
        where: { id: ot.id },
        data: { isPublished: false, status: "archived" },
      });
      await prisma.storeProduct.update({
        where: { id: ot.storeProductId },
        data: { isPublished: false },
      });
      duplicatesDisabled++;
    }

    console.log(
      `✓ ${p.group.padEnd(36)} → md=${p.long.length}c short=${p.short.length}c${
        otherTrs.length > 0 ? `  · ${otherTrs.length} duplicato/i disattivato/i` : ""
      }`
    );
    updated++;
  }
  console.log("");
  console.log(
    `Risultato: ${updated} aggiornati · ${notFound} non trovati · ${duplicatesDisabled} duplicati disattivati su ${targets.length} totali.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
