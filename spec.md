# App di Tracciamento GPS Mobile

## Panoramica
Un'applicazione web ottimizzata per dispositivi mobili che traccia la posizione GPS dell'utente in tempo reale e visualizza il percorso su una mappa interattiva con vista satellitare. Include la gestione di percorsi predefiniti con rilevamento automatico dei tempi di attraversamento, autenticazione utente e completamento profilo obbligatorio.

## Funzionalità Principali

### Autenticazione e Gestione Sessione
- Sistema di login obbligatorio per accedere all'applicazione
- **Inizializzazione robusta post-login**: dopo il login, il sistema deve completare correttamente l'inizializzazione dell'applicazione senza rimanere bloccato su "Inizializzazione..."
- **Gestione robusta dell'identità utente**: dopo il login, l'identità e il principal dell'utente devono essere sempre correttamente disponibili per tutte le operazioni backend
- **Inizializzazione dell'actor backend**: il sistema deve inizializzare correttamente l'actor backend dopo l'autenticazione, garantendo che tutte le funzionalità siano accessibili
- **Timeout e retry logic**: implementare meccanismi di timeout e retry per l'inizializzazione per evitare blocchi indefiniti
- **Validazione continua della sessione**: prima di ogni operazione di creazione o modifica percorsi, il sistema deve verificare che l'utente sia autenticato con un principal valido
- **Recupero automatico della sessione**: in caso di perdita temporanea dell'identità, il sistema deve essere in grado di recuperare automaticamente la sessione valida
- **Gestione degli stati di inizializzazione**: il sistema deve gestire correttamente gli stati di caricamento, successo ed errore durante l'inizializzazione
- Dopo il login e l'inizializzazione completata, l'utente accede alla pagina principale che contiene sia la gestione dei percorsi che l'opzione per iniziare il tracciamento
- Il tracciamento GPS è disponibile solo dopo l'autenticazione e l'inizializzazione completata

### Completamento Profilo Obbligatorio
- **Pagina di completamento profilo per nuovi utenti**: dopo il primo login, gli utenti devono completare obbligatoriamente il loro profilo prima di accedere alla pagina principale
- **Campi obbligatori del profilo**:
  - Nome utente (username)
  - Email (precompilata dall'autenticazione)
  - Nome barca
  - Categoria barca
  - Rating barca (numerico)
- **Validazione del profilo**: tutti i campi devono essere compilati correttamente prima di procedere
- **Salvataggio nel backend**: i dati del profilo vengono salvati nel backend e associati all'utente autenticato
- **Modifica profilo**: gli utenti possono modificare il loro profilo in qualsiasi momento dalla pagina principale
- **Controllo profilo esistente**: il sistema verifica se l'utente ha già completato il profilo per determinare se mostrare la pagina di completamento

### Pagina Principale Post-Login
- La pagina principale mostra tre sezioni principali:
  - **Gestione Percorsi**: per visualizzare, creare, modificare ed eliminare percorsi
  - **Inizia Tracciamento**: per avviare una nuova sessione di tracciamento
  - **Modifica Profilo**: per accedere alle impostazioni del profilo utente
- Tutte le funzionalità sono accessibili nella stessa pagina senza navigazione aggiuntiva
- **Accesso garantito**: l'utente deve poter accedere a tutte le funzionalità senza rimanere bloccato in stati di inizializzazione
- Accessibile solo dopo completamento del profilo per nuovi utenti

### Gestione Percorsi
- Creazione di nuovi percorsi inserendo 4 punti di riferimento:
  - Linea di partenza: punto 1 e punto 2 (con latitudine e longitudine)
  - Linea intermedia: punto 3 e punto 4 (con latitudine e longitudine)
- Ogni percorso ha un codice identificativo univoco e un nome
- **Validazione robusta dei punti di riferimento**: il sistema deve accettare correttamente tutti i punti con coordinate valide (non-zero) e visibili sulla mappa
- **Gestione errori migliorata**: messaggi di errore chiari e specifici in italiano per problemi di validazione, salvataggio o comunicazione con il backend
- **Feedback utente dettagliato**: notifiche di successo e fallimento durante la creazione, modifica ed eliminazione dei percorsi
- **Prevenzione errori di autenticazione**: tutte le operazioni di creazione, modifica ed eliminazione percorsi devono essere eseguite con un principal valido, evitando errori di "principal or identity not valid"
- Visualizzazione dell'elenco dei percorsi disponibili nella pagina principale
- Possibilità di modificare o eliminare percorsi esistenti direttamente dalla pagina principale
- Accessibile immediatamente dopo il login e l'inizializzazione completata

### Visualizzazione e Modifica Percorsi
- **Visualizzazione su mappa satellitare**: quando si visualizza o modifica un percorso, i 4 punti di riferimento vengono mostrati sulla mappa con vista satellitare
- **Indicatori colorati e numerati obbligatori**:
  - Punti 1 e 2 (linea di partenza): marcatori verdi con numeri chiaramente visibili "1" e "2"
  - Punti 3 e 4 (linea intermedia): marcatori rossi con numeri chiaramente visibili "3" e "4"
- La mappa utilizza sempre la vista satellitare per la visualizzazione e modifica dei percorsi
- **Visualizzazione automatica immediata**: quando si apre il dialogo di visualizzazione o modifica di un percorso esistente, tutti e 4 i punti di riferimento devono apparire immediatamente sulla mappa satellitare con i corretti colori e numeri, senza richiedere alcuna azione da parte dell'utente
- **Caricamento automatico dei marcatori**: i marcatori colorati e numerati devono essere visualizzati automaticamente all'apertura del dialogo, sia in modalità visualizzazione che modifica
- **Nessuna azione richiesta**: l'utente non deve premere "salva" o qualsiasi altro pulsante per vedere i punti di riferimento esistenti
- **Anteprima mappa funzionante**: l'anteprima della mappa nei dialoghi deve sempre mostrare immediatamente i punti definiti per qualsiasi percorso esistente
- I marcatori devono mostrare chiaramente la numerazione di ciascun punto per facilitare l'identificazione
- La visualizzazione dei marcatori deve essere consistente e funzionante in entrambe le modalità

### Configurazione Sessione e Selezione Automatica Percorso
- All'avvio di una nuova sessione di tracciamento, l'utente deve inserire:
  - Nome skipper (campo di testo)
  - Nome barca (campo di testo, precompilato dal profilo)
  - Rating (campo numerico, precompilato dal profilo)
- Se l'utente ha sessioni precedenti, i campi vengono pre-compilati con i valori dell'ultima sessione
- L'utente può modificare i valori pre-compilati prima di iniziare il tracciamento
- **Selezione automatica del percorso**: dopo aver inserito i dati della sessione, l'app rileva la posizione attuale dell'utente e seleziona automaticamente il percorso il cui punto 1 è entro 5 km dalla posizione corrente
- Se nessun percorso soddisfa questa condizione, mostra il messaggio "nessun percorso nelle vicinanze" e non avvia il tracciamento
- Solo dopo la selezione automatica del percorso vengono richiesti i permessi di geolocalizzazione

### Tracciamento GPS e Rilevamento Automatico
- Dopo la selezione automatica del percorso, inizia automaticamente la registrazione della posizione GPS
- Registra la posizione ogni 5 secondi
- Mostra il tempo trascorso dall'inizio del tracciamento
- Visualizza il percorso live sulla mappa mentre l'utente si muove
- **Rilevamento automatico degli attraversamenti**:
  - **Tempo di partenza**: quando l'utente attraversa la linea di partenza (da sinistra del punto 1 a destra del punto 2)
  - **Tempo intermedio**: quando attraversa la linea intermedia (da sinistra del punto 3 a destra del punto 4)
  - **Tempo finale**: quando attraversa nuovamente la linea di partenza in direzione opposta (da destra del punto 2 a sinistra del punto 1)

### Visualizzazione Mappa
- Mappa interattiva con vista satellitare che mostra la posizione corrente dell'utente
- Traccia il percorso percorso in tempo reale sovrapposto alla mappa geografica reale
- **Visualizzazione delle linee del percorso selezionato automaticamente** (linea di partenza e linea intermedia)
- Centrata automaticamente sulla posizione corrente
- Zoom automatico che si adatta per includere l'intero percorso tracciato
- Visualizzazione ottimizzata per dispositivi mobili

### Calcolo Distanza
- Calcola automaticamente la distanza totale percorsa utilizzando le posizioni GPS registrate
- Utilizza la formula di Haversine per calcolare la distanza tra punti GPS consecutivi
- Mostra la distanza totale quando l'utente termina la sessione di tracciamento

### Gestione Sessioni
- Pulsante per terminare la sessione di tracciamento
- Al termine della sessione, mostra il tempo trascorso, la distanza totale percorsa, e i tempi registrati (partenza, intermedio, finale)
- Salva tutti i dati nel backend inclusi tempo, distanza, nome skipper, nome barca, rating, codice percorso, tempo intermedio e tempo finale
- Possibilità di visualizzare le sessioni precedenti con vista satellitare, zoom adattivo, tempo trascorso, distanza percorsa, informazioni della sessione e tempi registrati

### Interfaccia Utente
- Design ottimizzato per dispositivi mobili
- Interfaccia completamente in lingua italiana
- **Gestione degli stati di inizializzazione**: indicatori di caricamento chiari durante l'inizializzazione post-login con messaggi informativi in italiano
- **Messaggi di errore per inizializzazione fallita**: messaggi di errore specifici in italiano se l'inizializzazione non riesce
- Pagina principale unificata che contiene gestione percorsi, opzione per iniziare il tracciamento e accesso al profilo
- Form di configurazione sessione con validazione
- **Form di completamento profilo obbligatorio** per nuovi utenti con validazione completa
- **Pagina di modifica profilo** accessibile dalla pagina principale
- Timer che mostra il tempo trascorso
- Visualizzazione dei tempi registrati durante il tracciamento
- Visualizzazione della distanza totale al termine della sessione
- Controlli semplici per avviare/fermare il tracciamento
- Sezione integrata per la gestione dei percorsi nella pagina principale
- **Messaggi di errore dettagliati in italiano** per problemi di creazione, modifica o eliminazione percorsi
- **Notifiche di successo** per operazioni completate correttamente
- **Indicatori di caricamento** durante le operazioni di salvataggio
- Messaggi di errore in italiano per situazioni come "nessun percorso nelle vicinanze"

## Dati Backend
Il backend deve memorizzare:
- **Utenti**: informazioni di autenticazione e identificativo utente
- **Profili utente**: username, email, nome barca, categoria barca, rating barca, associati all'utente autenticato
- **Percorsi**: codice identificativo univoco, nome, 4 punti di riferimento (latitudine e longitudine per ciascun punto), associati all'utente che li ha creati
- **Sessioni di tracciamento**: ogni sessione contiene un array di posizioni con timestamp, codice percorso utilizzato, tempo intermedio e tempo finale, associate all'utente autenticato
- **Posizioni**: coordinate GPS (latitudine, longitudine) e timestamp di registrazione
- **Metadati sessione**: data/ora di inizio, durata totale, distanza totale percorsa, numero di punti registrati, nome skipper, nome barca, rating, codice percorso, tempo intermedio, tempo finale
- **Identificativo utente**: per associare le sessioni, i percorsi e il profilo allo stesso utente autenticato e permettere il pre-riempimento dei campi

## Operazioni Backend
- **Gestire l'autenticazione degli utenti con validazione robusta del principal**: verificare sempre che il principal sia valido prima di eseguire qualsiasi operazione
- **Inizializzazione robusta dell'actor**: garantire che l'actor backend sia correttamente inizializzato e accessibile dopo l'autenticazione
- **Gestione dei timeout**: implementare timeout appropriati per le operazioni di inizializzazione per evitare blocchi indefiniti
- **Validazione continua dell'identità**: implementare controlli per assicurarsi che l'identità dell'utente sia sempre valida durante le operazioni di mutazione
- **Health check dell'actor**: fornire un endpoint per verificare che l'actor sia correttamente inizializzato e funzionante
- **Gestione profilo utente**: creare, recuperare e aggiornare i dati del profilo utente
- **Verificare completamento profilo**: controllare se l'utente ha completato il profilo per determinare il flusso di navigazione
- **Creare percorsi con validazione robusta**: accettare correttamente tutti i punti con coordinate valide e fornire messaggi di errore specifici in caso di problemi
- **Gestione errori migliorata**: restituire messaggi di errore dettagliati e localizzati in italiano per problemi di validazione o salvataggio
- **Modificare ed eliminare percorsi con autenticazione garantita**: assicurarsi che tutte le operazioni di modifica ed eliminazione siano eseguite con un principal valido
- Recuperare l'elenco dei percorsi disponibili per l'utente autenticato
- Recuperare i dettagli di un percorso specifico
- **Trovare percorsi entro 5 km da una posizione GPS specificata** per l'utente autenticato
- Salvare una nuova sessione di tracciamento completa con tempo, distanza, informazioni della sessione, codice percorso e tempi registrati per l'utente autenticato
- Recuperare l'elenco delle sessioni salvate con i relativi metadati per l'utente autenticato
- Recuperare i dettagli di una sessione specifica per la visualizzazione
- Recuperare l'ultima sessione dell'utente autenticato per il pre-riempimento dei campi

## Requisiti Tecnici
- **Sistema di autenticazione utente robusto con gestione persistente dell'identità**: garantire che il principal e l'identità siano sempre disponibili dopo il login
- **Inizializzazione robusta dell'applicazione**: implementare una logica di inizializzazione che completi correttamente dopo il login senza blocchi indefiniti
- **Gestione degli errori di inizializzazione**: implementare meccanismi per gestire e recuperare da errori durante l'inizializzazione dell'actor
- **Timeout e retry per l'inizializzazione**: implementare timeout appropriati e logica di retry per evitare che l'app rimanga bloccata su "Inizializzazione..."
- **Gestione degli errori di autenticazione**: implementare meccanismi per prevenire e gestire errori di "principal or identity not valid"
- **Validazione pre-operazione**: verificare sempre l'autenticazione prima di eseguire operazioni backend
- **Monitoraggio dello stato dell'actor**: implementare controlli per verificare che l'actor backend sia correttamente inizializzato e funzionante
- **Sistema di gestione profilo completo**: validazione, salvataggio e recupero dei dati del profilo utente
- **Controllo completamento profilo**: logica per verificare se l'utente deve completare il profilo
- Accesso alla geolocalizzazione del dispositivo (richiesto solo dopo la selezione automatica del percorso)
- Interfaccia responsive per dispositivi mobili
- Integrazione con servizi di mappe satellitari (es. OpenStreetMap con layer satellitare)
- Calcolo automatico dei bounds per il zoom adattivo del percorso
- Implementazione della formula di Haversine per il calcolo delle distanze GPS
- **Algoritmi di rilevamento dell'attraversamento delle linee** basati su coordinate GPS
- **Algoritmo per trovare percorsi entro 5 km da una posizione GPS** utilizzando la formula di Haversine
- **Validazione robusta delle coordinate GPS** per accettare correttamente punti validi non-zero
- **Sistema di gestione errori completo** con messaggi localizzati in italiano
- **Feedback utente migliorato** con notifiche di successo e fallimento
- Gestione degli stati di caricamento e errore per il GPS
- Validazione dei campi del form di configurazione sessione, creazione percorsi e completamento profilo
- Gestione degli errori di autenticazione
- Messaggi di errore localizzati in italiano
- **Caricamento automatico e immediato dei marcatori sulla mappa satellitare** nei dialoghi di visualizzazione e modifica percorsi, senza richiedere azioni dell'utente
