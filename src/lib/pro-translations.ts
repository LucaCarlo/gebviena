/**
 * Traduzioni dell'area riservata professionisti (5 lingue: it/fr/en/de/es).
 *
 * La lingua è quella memorizzata nel profilo del professionista
 * (`Professional.language`), così ogni utente vede l'area nella propria
 * lingua indipendentemente dal sito principale. Default fallback: italiano.
 */

export type ProLang = "it" | "fr" | "en" | "de" | "es";

export const PRO_LANGS: ProLang[] = ["it", "fr", "en", "de", "es"];

type Dict = Record<ProLang, string>;

const D: Record<string, Dict> = {
  // ── Comuni ──
  "common.back_to_dashboard": {
    it: "← Area Professionisti", fr: "← Espace Professionnels",
    en: "← Professional Area", de: "← Fachbereich", es: "← Área Profesionales",
  },
  "common.back_to_site": {
    it: "Torna al sito", fr: "Retour au site",
    en: "Back to site", de: "Zur Website", es: "Volver al sitio",
  },
  "common.loading": { it: "Caricamento…", fr: "Chargement…", en: "Loading…", de: "Lädt…", es: "Cargando…" },
  "common.empty": { it: "Nessun contenuto disponibile.", fr: "Aucun contenu disponible.", en: "No content available.", de: "Keine Inhalte verfügbar.", es: "Sin contenido disponible." },
  "common.download": { it: "Scarica", fr: "Télécharger", en: "Download", de: "Herunterladen", es: "Descargar" },
  "common.all": { it: "Tutti", fr: "Tous", en: "All", de: "Alle", es: "Todos" },
  "common.download_pdf": { it: "Scarica PDF", fr: "Télécharger PDF", en: "Download PDF", de: "PDF herunterladen", es: "Descargar PDF" },
  "common.open": { it: "Apri", fr: "Ouvrir", en: "Open", de: "Öffnen", es: "Abrir" },
  "common.save": { it: "Salva", fr: "Enregistrer", en: "Save", de: "Speichern", es: "Guardar" },
  "common.saving": { it: "Salvataggio…", fr: "Enregistrement…", en: "Saving…", de: "Speichert…", es: "Guardando…" },
  "common.in_progress": { it: "In lavorazione", fr: "En cours", en: "Work in progress", de: "In Bearbeitung", es: "En desarrollo" },

  // ── Ruoli ──
  "role.ARCHITECT_DESIGNER": { it: "Architetto / Designer", fr: "Architecte / Designer", en: "Architect / Designer", de: "Architekt / Designer", es: "Arquitecto / Diseñador" },
  "role.PRESS": { it: "Stampa", fr: "Presse", en: "Press", de: "Presse", es: "Prensa" },
  "role.RESELLER": { it: "Rivenditore", fr: "Revendeur", en: "Reseller", de: "Wiederverkäufer", es: "Distribuidor" },
  "role.AGENT": { it: "Agente", fr: "Agent", en: "Agent", de: "Vertreter", es: "Agente" },

  // ── Dashboard ──
  "dashboard.welcome": { it: "Benvenuto", fr: "Bienvenue", en: "Welcome", de: "Willkommen", es: "Bienvenido" },
  "dashboard.title": { it: "Area Professionisti", fr: "Espace Professionnels", en: "Professional Area", de: "Fachbereich", es: "Área Profesionales" },
  "dashboard.subtitle": {
    it: "Accedi ai contenuti dedicati alla tua tipologia di professionista.",
    fr: "Accédez aux contenus dédiés à votre type de professionnel.",
    en: "Access the resources reserved for your professional category.",
    de: "Greifen Sie auf die Inhalte zu, die Ihrer Berufsgruppe vorbehalten sind.",
    es: "Accede a los contenidos dedicados a tu tipología de profesional.",
  },
  "dashboard.cta.open": { it: "Apri →", fr: "Ouvrir →", en: "Open →", de: "Öffnen →", es: "Abrir →" },
  "dashboard.cta.manage_account": { it: "Gestisci account", fr: "Gérer le compte", en: "Manage account", de: "Konto verwalten", es: "Gestionar cuenta" },
  "dashboard.cta.logout": { it: "Logout", fr: "Déconnexion", en: "Logout", de: "Abmelden", es: "Cerrar sesión" },

  // ── Sezioni (label + description) ──
  "section.informazioni-tecniche.label": { it: "Informazioni tecniche", fr: "Informations techniques", en: "Technical information", de: "Technische Informationen", es: "Información técnica" },
  "section.informazioni-tecniche.desc": {
    it: "Schede tecniche, disegni 2D/3D, istruzioni di montaggio e manutenzione.",
    fr: "Fiches techniques, dessins 2D/3D, instructions de montage et entretien.",
    en: "Technical sheets, 2D/3D drawings, assembly instructions and maintenance.",
    de: "Datenblätter, 2D/3D-Zeichnungen, Montageanleitungen und Pflegehinweise.",
    es: "Fichas técnicas, dibujos 2D/3D, instrucciones de montaje y mantenimiento.",
  },

  "section.digital-media.label": { it: "Digital & Media", fr: "Digital & Médias", en: "Digital & Media", de: "Digital & Medien", es: "Digital & Media" },
  "section.digital-media.desc": {
    it: "Foto, render e materiali digitali dei prodotti.",
    fr: "Photos, rendus et matériaux numériques des produits.",
    en: "Photos, renders and digital materials of the products.",
    de: "Fotos, Renderings und digitale Materialien der Produkte.",
    es: "Fotos, renders y materiales digitales de los productos.",
  },

  "section.cataloghi.label": { it: "Cataloghi, poster e journal", fr: "Catalogues, posters et journal", en: "Catalogues, posters and journal", de: "Kataloge, Poster und Journal", es: "Catálogos, pósters y journal" },
  "section.cataloghi.desc": {
    it: "Catalogo generale, monografie, poster, journal.",
    fr: "Catalogue général, monographies, posters, journal.",
    en: "General catalogue, monographs, posters, journal.",
    de: "Gesamtkatalog, Monografien, Poster, Journal.",
    es: "Catálogo general, monografías, pósters, journal.",
  },

  "section.pcon.label": { it: "pCon configuratore", fr: "Configurateur pCon", en: "pCon configurator", de: "pCon-Konfigurator", es: "Configurador pCon" },
  "section.pcon.desc": {
    it: "Configura le sedute online e accedi all'intero catalogo.",
    fr: "Configurez les sièges en ligne et accédez au catalogue complet.",
    en: "Configure seating online and access the entire catalogue.",
    de: "Konfigurieren Sie Sitzmöbel online und greifen Sie auf den gesamten Katalog zu.",
    es: "Configura los asientos online y accede al catálogo completo.",
  },

  "section.press-kit.label": { it: "Press kit", fr: "Press kit", en: "Press kit", de: "Pressemappe", es: "Press kit" },
  "section.press-kit.desc": {
    it: "Comunicati stampa, immagini ad alta risoluzione, biografie.",
    fr: "Communiqués de presse, images haute résolution, biographies.",
    en: "Press releases, high-resolution images, biographies.",
    de: "Pressemitteilungen, hochauflösende Bilder, Biografien.",
    es: "Comunicados de prensa, imágenes de alta resolución, biografías.",
  },

  "section.listino-prezzi.label": { it: "Listino prezzi", fr: "Liste de prix", en: "Price list", de: "Preisliste", es: "Lista de precios" },
  "section.listino-prezzi.desc": {
    it: "Listino aggiornato per agenti e rivenditori autorizzati.",
    fr: "Liste de prix mise à jour pour agents et revendeurs autorisés.",
    en: "Updated price list for agents and authorised resellers.",
    de: "Aktuelle Preisliste für Vertreter und autorisierte Händler.",
    es: "Lista de precios actualizada para agentes y distribuidores autorizados.",
  },

  "section.materiale-aziendale.label": { it: "Materiale aziendale", fr: "Documents d'entreprise", en: "Corporate material", de: "Unternehmensunterlagen", es: "Material corporativo" },
  "section.materiale-aziendale.desc": {
    it: "Company profile, loghi, presentazioni e info corporate.",
    fr: "Company profile, logos, présentations et infos corporate.",
    en: "Company profile, logos, presentations and corporate info.",
    de: "Unternehmensprofil, Logos, Präsentationen und Firmeninfos.",
    es: "Company profile, logos, presentaciones e información corporate.",
  },

  // ── Pagina Informazioni tecniche ──
  "info.intro": {
    it: "Schede tecniche, modelli CAD, istruzioni di montaggio e indicazioni di cura per i prodotti Gebrüder Thonet Vienna.",
    fr: "Fiches techniques, modèles CAO, instructions de montage et indications d'entretien pour les produits Gebrüder Thonet Vienna.",
    en: "Technical sheets, CAD models, assembly instructions and care indications for Gebrüder Thonet Vienna products.",
    de: "Datenblätter, CAD-Modelle, Montageanleitungen und Pflegehinweise für Gebrüder Thonet Vienna Produkte.",
    es: "Fichas técnicas, modelos CAD, instrucciones de montaje e indicaciones de cuidado para los productos Gebrüder Thonet Vienna.",
  },
  "info.tab.schedeCad": { it: "Schede & CAD", fr: "Fiches & CAO", en: "Sheets & CAD", de: "Datenblätter & CAD", es: "Fichas y CAD" },
  "info.tab.instructions": { it: "Istruzioni di montaggio", fr: "Instructions de montage", en: "Assembly instructions", de: "Montageanleitung", es: "Instrucciones de montaje" },
  "info.tab.care": { it: "Cura & manutenzione", fr: "Entretien", en: "Care & maintenance", de: "Pflege & Wartung", es: "Cuidado y mantenimiento" },
  "info.col.sheet": { it: "Scheda", fr: "Fiche", en: "Sheet", de: "Datenblatt", es: "Ficha" },
  "info.empty": {
    it: "Nessun documento disponibile in questa sezione.",
    fr: "Aucun document disponible dans cette section.",
    en: "No document available in this section.",
    de: "Keine Dokumente in diesem Bereich verfügbar.",
    es: "No hay documentos disponibles en esta sección.",
  },

  // ── Pagina Cataloghi ──
  "catalogs.intro": {
    it: "Catalogo generale, monografie, poster e journal. Clicca su una copertina per scaricare il PDF.",
    fr: "Catalogue général, monographies, posters et journal. Cliquez sur une couverture pour télécharger le PDF.",
    en: "General catalogue, monographs, posters and journal. Click on a cover to download the PDF.",
    de: "Gesamtkatalog, Monografien, Poster und Journal. Klicken Sie auf ein Cover, um die PDF herunterzuladen.",
    es: "Catálogo general, monografías, pósters y journal. Haz clic en una portada para descargar el PDF.",
  },
  "catalogs.section.cataloghi": { it: "Cataloghi", fr: "Catalogues", en: "Catalogues", de: "Kataloge", es: "Catálogos" },
  "catalogs.section.slow_living": { it: "Slow Living Journal", fr: "Slow Living Journal", en: "Slow Living Journal", de: "Slow Living Journal", es: "Slow Living Journal" },
  "catalogs.section.poster": { it: "Poster", fr: "Posters", en: "Posters", de: "Poster", es: "Pósters" },
  "catalogs.empty": {
    it: "Nessun catalogo disponibile al momento.",
    fr: "Aucun catalogue disponible pour le moment.",
    en: "No catalogue available at the moment.",
    de: "Derzeit kein Katalog verfügbar.",
    es: "Ningún catálogo disponible por el momento.",
  },
  "catalogs.preview_unavailable": { it: "Anteprima non disponibile", fr: "Aperçu non disponible", en: "Preview not available", de: "Vorschau nicht verfügbar", es: "Vista previa no disponible" },
  "catalogs.pdf_unavailable": { it: "PDF non disponibile", fr: "PDF non disponible", en: "PDF not available", de: "PDF nicht verfügbar", es: "PDF no disponible" },

  // ── Pagina pCon ──
  "pcon.open_new_tab": { it: "Apri in nuova scheda ↗", fr: "Ouvrir dans un nouvel onglet ↗", en: "Open in new tab ↗", de: "In neuem Tab öffnen ↗", es: "Abrir en una nueva pestaña ↗" },
  "pcon.back_to_catalog": { it: "↺ Torna al catalogo", fr: "↺ Retour au catalogue", en: "↺ Back to catalogue", de: "↺ Zurück zum Katalog", es: "↺ Volver al catálogo" },

  // ── Pagine placeholder (Digital, Press kit, Listino) ──
  "placeholder.digital_media.body": {
    it: "Stiamo organizzando l'archivio digitale: foto, render e materiali multimediali saranno disponibili a breve.",
    fr: "Nous organisons les archives numériques : photos, rendus et matériels multimédias seront bientôt disponibles.",
    en: "We are organising the digital archive: photos, renders and multimedia materials will be available soon.",
    de: "Wir organisieren das digitale Archiv: Fotos, Renderings und Multimedia-Materialien werden bald verfügbar sein.",
    es: "Estamos organizando el archivo digital: fotos, renders y materiales multimedia estarán disponibles próximamente.",
  },
  "placeholder.digital_media.contact": {
    it: "Per richieste urgenti scrivici a", fr: "Pour les demandes urgentes écrivez à",
    en: "For urgent requests please email", de: "Für dringende Anfragen schreiben Sie an", es: "Para solicitudes urgentes escríbenos a",
  },

  "placeholder.press_kit.body": {
    it: "Il press kit sarà caricato a breve: comunicati stampa, immagini ad alta risoluzione, biografie dei designer.",
    fr: "Le press kit sera bientôt disponible : communiqués de presse, images haute résolution, biographies des designers.",
    en: "The press kit will be uploaded soon: press releases, high-resolution images, designer biographies.",
    de: "Die Pressemappe wird in Kürze hochgeladen: Pressemitteilungen, hochauflösende Bilder, Designer-Biografien.",
    es: "El press kit se cargará pronto: comunicados de prensa, imágenes de alta resolución, biografías de los diseñadores.",
  },
  "placeholder.press_kit.contact": {
    it: "Per richieste rapide:", fr: "Pour les demandes rapides :", en: "For quick requests:", de: "Für schnelle Anfragen:", es: "Para solicitudes rápidas:",
  },

  "placeholder.listino.body": {
    it: "Il listino prezzi aggiornato sarà disponibile a breve. Riservato esclusivamente ad agenti e rivenditori autorizzati. Per il listino corrente contatta il tuo referente commerciale.",
    fr: "La liste de prix mise à jour sera bientôt disponible. Réservée exclusivement aux agents et revendeurs autorisés. Pour la liste de prix actuelle, contactez votre référent commercial.",
    en: "The updated price list will be available soon. Reserved exclusively for agents and authorised resellers. For the current price list contact your sales representative.",
    de: "Die aktualisierte Preisliste wird in Kürze verfügbar sein. Ausschließlich für Vertreter und autorisierte Händler. Für die aktuelle Preisliste wenden Sie sich an Ihren Vertriebspartner.",
    es: "La lista de precios actualizada estará disponible pronto. Reservada exclusivamente a agentes y distribuidores autorizados. Para la lista actual contacta con tu referente comercial.",
  },

  // ── Pagina Materiale Aziendale ──
  "mat.unavailable_title": { it: "Non ancora disponibile", fr: "Pas encore disponible", en: "Not yet available", de: "Noch nicht verfügbar", es: "Aún no disponible" },
  "mat.unavailable_body": {
    it: "I documenti aziendali non sono ancora stati caricati dall'amministratore.",
    fr: "Les documents d'entreprise n'ont pas encore été chargés par l'administrateur.",
    en: "Corporate documents have not been uploaded yet by the administrator.",
    de: "Die Unternehmensunterlagen wurden vom Administrator noch nicht hochgeladen.",
    es: "Los documentos corporativos aún no han sido cargados por el administrador.",
  },
  "mat.section.logos": { it: "Loghi", fr: "Logos", en: "Logos", de: "Logos", es: "Logos" },
  "mat.section.documents": { it: "Documenti", fr: "Documents", en: "Documents", de: "Dokumente", es: "Documentos" },
  "mat.section.contacts": { it: "Contatti", fr: "Contacts", en: "Contacts", de: "Kontakte", es: "Contactos" },
  "mat.logo.main": { it: "Logo principale", fr: "Logo principal", en: "Main logo", de: "Hauptlogo", es: "Logo principal" },
  "mat.logo.white": { it: "Logo bianco", fr: "Logo blanc", en: "White logo", de: "Weißes Logo", es: "Logo blanco" },
  "mat.logo.dark": { it: "Logo nero / scuro", fr: "Logo noir / foncé", en: "Black / dark logo", de: "Schwarzes / dunkles Logo", es: "Logo negro / oscuro" },
  "mat.doc.profile": { it: "Company Profile", fr: "Company Profile", en: "Company Profile", de: "Company Profile", es: "Company Profile" },
  "mat.doc.brand": { it: "Brand Guidelines", fr: "Brand Guidelines", en: "Brand Guidelines", de: "Brand Guidelines", es: "Brand Guidelines" },
  "mat.doc.presentation": { it: "Presentazione", fr: "Présentation", en: "Presentation", de: "Präsentation", es: "Presentación" },
  "mat.fallback_subtitle": {
    it: "Loghi ufficiali, documenti corporate e contatti di",
    fr: "Logos officiels, documents corporate et contacts de",
    en: "Official logos, corporate documents and contacts of",
    de: "Offizielle Logos, Unternehmensunterlagen und Kontakte von",
    es: "Logos oficiales, documentos corporativos y contactos de",
  },

  // ── Pagina Account ──
  "account.title": { it: "Il mio account", fr: "Mon compte", en: "My account", de: "Mein Konto", es: "Mi cuenta" },
  "account.intro": {
    it: "Aggiorna i tuoi dati personali e la password. L'email e il ruolo non possono essere modificati: per cambiarli scrivici a",
    fr: "Mettez à jour vos données personnelles et votre mot de passe. L'email et le rôle ne peuvent pas être modifiés : pour les changer écrivez-nous à",
    en: "Update your personal data and password. Email and role cannot be modified: to change them email us at",
    de: "Aktualisieren Sie Ihre persönlichen Daten und Ihr Passwort. E-Mail und Rolle können nicht geändert werden: Bitte schreiben Sie uns dazu an",
    es: "Actualiza tus datos personales y la contraseña. El email y el rol no se pueden modificar: para cambiarlos escríbenos a",
  },
  "account.summary": { it: "Riepilogo account", fr: "Résumé du compte", en: "Account summary", de: "Kontoübersicht", es: "Resumen de la cuenta" },
  "account.email_login": { it: "Email (login)", fr: "Email (identifiant)", en: "Email (login)", de: "E-Mail (Login)", es: "Email (acceso)" },
  "account.role": { it: "Ruolo", fr: "Rôle", en: "Role", de: "Rolle", es: "Rol" },
  "account.personal": { it: "Dati personali", fr: "Données personnelles", en: "Personal data", de: "Persönliche Daten", es: "Datos personales" },
  "account.first_name": { it: "Nome *", fr: "Prénom *", en: "First name *", de: "Vorname *", es: "Nombre *" },
  "account.last_name": { it: "Cognome *", fr: "Nom *", en: "Last name *", de: "Nachname *", es: "Apellido *" },
  "account.phone": { it: "Telefono", fr: "Téléphone", en: "Phone", de: "Telefon", es: "Teléfono" },
  "account.company_studio": { it: "Studio *", fr: "Studio *", en: "Studio *", de: "Studio *", es: "Estudio *" },
  "account.company_press": { it: "Testata *", fr: "Média *", en: "Outlet *", de: "Medium *", es: "Medio *" },
  "account.company_default": { it: "Azienda *", fr: "Entreprise *", en: "Company *", de: "Firma *", es: "Empresa *" },
  "account.language": { it: "Lingua preferita", fr: "Langue préférée", en: "Preferred language", de: "Bevorzugte Sprache", es: "Idioma preferido" },
  "account.save_data": { it: "Salva dati", fr: "Enregistrer les données", en: "Save data", de: "Daten speichern", es: "Guardar datos" },
  "account.saved": { it: "Dati aggiornati.", fr: "Données mises à jour.", en: "Data updated.", de: "Daten aktualisiert.", es: "Datos actualizados." },
  "account.required": { it: "Nome, cognome e azienda sono obbligatori.", fr: "Prénom, nom et entreprise sont obligatoires.", en: "First name, last name and company are required.", de: "Vorname, Nachname und Firma sind erforderlich.", es: "Nombre, apellido y empresa son obligatorios." },

  "account.password_title": { it: "Cambia password", fr: "Changer le mot de passe", en: "Change password", de: "Passwort ändern", es: "Cambiar contraseña" },
  "account.password_current": { it: "Password attuale *", fr: "Mot de passe actuel *", en: "Current password *", de: "Aktuelles Passwort *", es: "Contraseña actual *" },
  "account.password_new": { it: "Nuova password *", fr: "Nouveau mot de passe *", en: "New password *", de: "Neues Passwort *", es: "Nueva contraseña *" },
  "account.password_confirm": { it: "Conferma nuova password *", fr: "Confirmer le nouveau mot de passe *", en: "Confirm new password *", de: "Neues Passwort bestätigen *", es: "Confirmar nueva contraseña *" },
  "account.password_hint": {
    it: "Almeno 8 caratteri, una maiuscola, una minuscola e un numero.",
    fr: "Au moins 8 caractères, une majuscule, une minuscule et un chiffre.",
    en: "At least 8 characters, one uppercase, one lowercase and one number.",
    de: "Mindestens 8 Zeichen, ein Groß-, ein Kleinbuchstabe und eine Zahl.",
    es: "Al menos 8 caracteres, una mayúscula, una minúscula y un número.",
  },
  "account.password_btn": { it: "Cambia password", fr: "Changer le mot de passe", en: "Change password", de: "Passwort ändern", es: "Cambiar contraseña" },
  "account.password_changing": { it: "Aggiornamento…", fr: "Mise à jour…", en: "Updating…", de: "Aktualisierung…", es: "Actualizando…" },
  "account.password_changed": { it: "Password aggiornata.", fr: "Mot de passe mis à jour.", en: "Password updated.", de: "Passwort aktualisiert.", es: "Contraseña actualizada." },
  "account.password_mismatch": { it: "Le due nuove password non coincidono.", fr: "Les deux nouveaux mots de passe ne correspondent pas.", en: "The two new passwords do not match.", de: "Die beiden neuen Passwörter stimmen nicht überein.", es: "Las dos nuevas contraseñas no coinciden." },
  "account.password_weak": {
    it: "La nuova password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero.",
    fr: "Le nouveau mot de passe doit comporter au moins 8 caractères, une majuscule, une minuscule et un chiffre.",
    en: "The new password must have at least 8 characters, one uppercase, one lowercase and one number.",
    de: "Das neue Passwort muss mindestens 8 Zeichen, einen Groß-, einen Kleinbuchstaben und eine Zahl enthalten.",
    es: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.",
  },
  "account.field_required": { it: "Compila tutti i campi.", fr: "Veuillez remplir tous les champs.", en: "Please fill in all fields.", de: "Bitte alle Felder ausfüllen.", es: "Completa todos los campos." },
  "account.network_error": { it: "Errore di rete", fr: "Erreur de réseau", en: "Network error", de: "Netzwerkfehler", es: "Error de red" },

  // ── Digital & Media ──
  "media.by_product": { it: "Per Prodotto", fr: "Par Produit", en: "By Product", de: "Nach Produkt", es: "Por Producto" },
  "media.by_project": { it: "Per Progetto", fr: "Par Projet", en: "By Project", de: "Nach Projekt", es: "Por Proyecto" },
  "media.by_typology": { it: "Per Tipologia", fr: "Par Typologie", en: "By Typology", de: "Nach Typologie", es: "Por Tipología" },
  "media.search_product": { it: "Cerca prodotto…", fr: "Rechercher un produit…", en: "Search product…", de: "Produkt suchen…", es: "Buscar producto…" },
  "media.search_project": { it: "Cerca progetto…", fr: "Rechercher un projet…", en: "Search project…", de: "Projekt suchen…", es: "Buscar proyecto…" },
  "media.all_typologies": { it: "Tutte le tipologie", fr: "Toutes les typologies", en: "All typologies", de: "Alle Typologien", es: "Todas las tipologías" },
  "media.download_all": { it: "Scarica tutte", fr: "Tout télécharger", en: "Download all", de: "Alle herunterladen", es: "Descargar todas" },
  "media.products_available": { it: "prodotti disponibili", fr: "produits disponibles", en: "products available", de: "Produkte verfügbar", es: "productos disponibles" },
  "media.projects_available": { it: "progetti disponibili", fr: "projets disponibles", en: "projects available", de: "Projekte verfügbar", es: "proyectos disponibles" },
  "media.no_products": { it: "Nessun prodotto con immagini disponibili.", fr: "Aucun produit avec des images disponibles.", en: "No products with available images.", de: "Keine Produkte mit verfügbaren Bildern.", es: "Ningún producto con imágenes disponibles." },
  "media.no_projects": { it: "Nessun progetto con immagini disponibili.", fr: "Aucun projet avec des images disponibles.", en: "No projects with available images.", de: "Keine Projekte mit verfügbaren Bildern.", es: "Ningún proyecto con imágenes disponibles." },
  "media.back_to_typologies": { it: "← Tutte le tipologie", fr: "← Toutes les typologies", en: "← All typologies", de: "← Alle Typologien", es: "← Todas las tipologías" },
  "media.no_photos": { it: "Nessuna foto.", fr: "Aucune photo.", en: "No photos.", de: "Keine Fotos.", es: "Sin fotos." },
  "media.photo_available": { it: "foto disponibile", fr: "photo disponible", en: "photo available", de: "Foto verfügbar", es: "foto disponible" },
  "media.photos_available": { it: "foto disponibili", fr: "photos disponibles", en: "photos available", de: "Fotos verfügbar", es: "fotos disponibles" },
  "media.images_count": { it: "immagini", fr: "images", en: "images", de: "Bilder", es: "imágenes" },
};

export function tPro(lang: string | null | undefined, key: string): string {
  const l: ProLang = PRO_LANGS.includes((lang || "it") as ProLang) ? ((lang || "it") as ProLang) : "it";
  return D[key]?.[l] ?? D[key]?.it ?? key;
}

/** Helper: ritorna una funzione t(key) per la lingua specificata. */
export function getProT(lang: string | null | undefined) {
  return (key: string) => tPro(lang, key);
}
