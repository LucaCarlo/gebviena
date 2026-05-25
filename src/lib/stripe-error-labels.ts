/**
 * Traduzione human-readable in italiano dei codici di errore Stripe.
 *
 * Il webhook salva paymentErrorMessage nel formato:
 *   "{code} · {decline_code?} · {message_inglese}"
 *
 * Questa funzione fa il parse del primo / secondo segmento e ritorna
 * un'etichetta italiana operativa, una descrizione lunga e una
 * raccomandazione su cosa dire al cliente.
 */

export interface HumanizedStripeError {
  shortLabel: string;      // tag breve per la lista (max ~30 char)
  description: string;     // spiegazione operativa
  customerSuggestion: string; // cosa dire al cliente
  severity: "warn" | "blocker" | "retry"; // warn=riprovabile, retry=banca, blocker=cambia carta
}

// Codici Stripe (api error code)
const STRIPE_CODE_MAP: Record<string, HumanizedStripeError> = {
  payment_intent_authentication_failure: {
    shortLabel: "Autenticazione 3DS fallita",
    description: "Il cliente non ha completato l'autenticazione 3D Secure (SMS/app banca) o ha annullato il pop-up.",
    customerSuggestion: "Riprova il pagamento e completa la conferma con la tua banca (SMS, app o codice OTP).",
    severity: "retry",
  },
  authentication_required: {
    shortLabel: "Autenticazione richiesta",
    description: "La carta richiede autenticazione 3D Secure ma non è stata eseguita.",
    customerSuggestion: "Riprova il pagamento e conferma con la tua banca quando richiesto.",
    severity: "retry",
  },
  card_declined: {
    shortLabel: "Carta rifiutata",
    description: "La banca emittente ha rifiutato il pagamento. Vedi decline_code per il motivo specifico.",
    customerSuggestion: "Contatta la tua banca o riprova con un'altra carta.",
    severity: "blocker",
  },
  expired_card: {
    shortLabel: "Carta scaduta",
    description: "La carta usata è scaduta.",
    customerSuggestion: "Usa una carta valida (controlla data di scadenza).",
    severity: "blocker",
  },
  incorrect_cvc: {
    shortLabel: "CVV sbagliato",
    description: "Il codice CVV (3 cifre dietro la carta) non è corretto.",
    customerSuggestion: "Controlla il CVV (3 cifre sul retro della carta) e riprova.",
    severity: "retry",
  },
  incorrect_number: {
    shortLabel: "Numero carta sbagliato",
    description: "Il numero della carta inserito non è valido.",
    customerSuggestion: "Ricontrolla il numero della carta e riprova.",
    severity: "retry",
  },
  processing_error: {
    shortLabel: "Errore temporaneo banca",
    description: "Errore temporaneo del network bancario. Spesso si risolve riprovando.",
    customerSuggestion: "Riprova tra qualche minuto.",
    severity: "retry",
  },
  api_connection_error: {
    shortLabel: "Errore rete Stripe",
    description: "Problema temporaneo di connessione con Stripe. Non è colpa della carta del cliente.",
    customerSuggestion: "Riprova fra qualche istante.",
    severity: "retry",
  },
  rate_limit: {
    shortLabel: "Troppe richieste",
    description: "Troppi tentativi in pochi secondi (rate limit Stripe).",
    customerSuggestion: "Aspetta qualche minuto e riprova.",
    severity: "retry",
  },
  invalid_request_error: {
    shortLabel: "Richiesta non valida",
    description: "La richiesta inviata a Stripe è malformata. Probabile bug del sistema.",
    customerSuggestion: "Contatta l'assistenza GTV — è un problema tecnico, non della tua carta.",
    severity: "blocker",
  },
};

// Codici decline_code (motivo banca)
const STRIPE_DECLINE_CODE_MAP: Record<string, HumanizedStripeError> = {
  insufficient_funds: {
    shortLabel: "Fondi insufficienti",
    description: "Sulla carta non c'erano fondi sufficienti per completare il pagamento.",
    customerSuggestion: "Usa un'altra carta oppure paga con bonifico bancario.",
    severity: "blocker",
  },
  lost_card: {
    shortLabel: "Carta smarrita",
    description: "La carta è stata dichiarata smarrita dalla banca.",
    customerSuggestion: "Usa una carta diversa.",
    severity: "blocker",
  },
  stolen_card: {
    shortLabel: "Carta rubata",
    description: "La carta è stata dichiarata rubata. NON riprovare con questa carta.",
    customerSuggestion: "Usa una carta diversa e contatta la banca.",
    severity: "blocker",
  },
  pickup_card: {
    shortLabel: "Carta bloccata",
    description: "La banca ha bloccato/sequestrato la carta. NON riprovare con questa carta.",
    customerSuggestion: "Contatta la tua banca e usa un'altra carta.",
    severity: "blocker",
  },
  do_not_honor: {
    shortLabel: "Banca rifiuta (anti-frode)",
    description: "La banca emittente ha rifiutato senza motivo specifico. Spesso è un blocco anti-frode automatico.",
    customerSuggestion: "Contatta la tua banca per autorizzare il pagamento, oppure usa un'altra carta / bonifico.",
    severity: "retry",
  },
  restricted_card: {
    shortLabel: "Carta con restrizioni",
    description: "La carta non è abilitata per questo tipo di transazione (es. pagamenti online o all'estero).",
    customerSuggestion: "Sblocca la carta dalla tua banca o usane una diversa.",
    severity: "blocker",
  },
  transaction_not_allowed: {
    shortLabel: "Transazione non consentita",
    description: "Il tipo di transazione non è permesso dalla banca (es. importo sopra limite, categoria bloccata).",
    customerSuggestion: "Contatta la tua banca per autorizzare l'operazione.",
    severity: "retry",
  },
  currency_not_supported: {
    shortLabel: "Valuta non supportata",
    description: "La carta non supporta pagamenti in EUR.",
    customerSuggestion: "Usa una carta che supporti gli euro.",
    severity: "blocker",
  },
  withdrawal_count_limit_exceeded: {
    shortLabel: "Limite transazioni superato",
    description: "Limite di transazioni giornaliere/mensili superato sulla carta.",
    customerSuggestion: "Riprova domani o usa un'altra carta.",
    severity: "retry",
  },
  try_again_later: {
    shortLabel: "Riprova più tardi",
    description: "La banca emittente è temporaneamente non raggiungibile.",
    customerSuggestion: "Riprova fra qualche minuto.",
    severity: "retry",
  },
  issuer_not_available: {
    shortLabel: "Banca non raggiungibile",
    description: "La banca emittente è temporaneamente offline.",
    customerSuggestion: "Riprova fra qualche minuto.",
    severity: "retry",
  },
  generic_decline: {
    shortLabel: "Rifiuto generico banca",
    description: "La banca ha rifiutato senza specificare un motivo.",
    customerSuggestion: "Contatta la tua banca o usa un'altra carta.",
    severity: "retry",
  },
};

/**
 * Prende il messaggio raw salvato in paymentErrorMessage e ritorna la versione
 * tradotta. Se nessun codice è riconosciuto, mostra il messaggio originale come fallback.
 *
 * Formato atteso input: "{code} · {decline_code?} · {message}"
 */
export function humanizeStripeError(raw: string | null | undefined): HumanizedStripeError {
  const fallback: HumanizedStripeError = {
    shortLabel: "Errore pagamento",
    description: raw || "Errore generico nel processo di pagamento.",
    customerSuggestion: "Riprova il pagamento o contatta l'assistenza.",
    severity: "retry",
  };
  if (!raw || typeof raw !== "string") return fallback;

  // Il formato è "{code} · {decline_code?} · {message}". Prendiamo i primi due segmenti.
  const parts = raw.split(" · ").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return fallback;

  const code = parts[0];
  const declineCode = parts.length >= 2 ? parts[1] : null;

  // Priorità: decline_code (più specifico) > code (generico)
  if (declineCode && STRIPE_DECLINE_CODE_MAP[declineCode]) {
    return STRIPE_DECLINE_CODE_MAP[declineCode];
  }
  if (STRIPE_CODE_MAP[code]) {
    return STRIPE_CODE_MAP[code];
  }
  return { ...fallback, shortLabel: code ? `Errore: ${code}` : fallback.shortLabel };
}
