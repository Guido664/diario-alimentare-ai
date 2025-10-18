import { GoogleGenAI, Type } from "@google/genai";
import type { DailyEntry, UserProfile } from '../types';

// Fix: Removed `as string` to align with @google/genai coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const dailyAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.NUMBER, description: "Stima delle calorie totali" },
    protein: { type: Type.NUMBER, description: "Stima delle proteine totali in grammi" },
    carbs: { type: Type.NUMBER, description: "Stima dei carboidrati totali in grammi" },
    fats: { type: Type.NUMBER, description: "Stima dei grassi totali in grammi" },
    summary: { type: Type.STRING, description: "Un breve riassunto incoraggiante dell'assunzione giornaliera, tenendo conto dell'attività fisica e valutando se l'apporto è adeguato in base al profilo e agli obiettivi dell'utente." },
    micronutrients: {
      type: Type.ARRAY,
      description: "Elenco dei principali micronutrienti presenti nei pasti.",
      items: { type: Type.STRING },
    },
  },
  required: ["calories", "protein", "carbs", "fats", "summary"],
};

const buildUserProfileString = (profile: UserProfile): string => {
    if (!profile || Object.keys(profile).every(k => !profile[k as keyof UserProfile])) {
        return "Nessun profilo utente fornito.";
    }

    const goalMap = {
        lose_weight: "Perdere peso (deficit calorico)",
        gain_muscle: "Aumentare la massa muscolare (surplus calorico, focus proteico)",
        maintain_weight: "Mantenere il peso",
        improve_performance: "Migliorare la performance sportiva",
        eat_healthier: "Mangiare in modo più sano e consapevole",
        identify_issues: "Identificare cibi che causano problemi"
    };

    const lifestyleMap = {
        sedentary: "Sedentario (impiegato)",
        moderately_active: "Moderatamente attivo (commesso, cameriere)",
        active: "Attivo (muratore, contadino)"
    };

    return `
        - Età: ${profile.age || 'Non specificata'}
        - Sesso: ${profile.gender || 'Non specificato'}
        - Altezza: ${profile.height || 'Non specificata'} cm
        - Peso: ${profile.weight || 'Non specificata'} kg
        - Stile di vita lavorativo: ${profile.lifestyle ? lifestyleMap[profile.lifestyle] : 'Non specificato'}
        - Obiettivo: ${profile.goal ? goalMap[profile.goal] : 'Non specificato'}
        - Condizioni mediche/diete: ${profile.conditions || 'Nessuna'}
    `.trim();
}

export const analyzeDailyMeals = async (entry: DailyEntry, profile: UserProfile) => {
  const { meals, activity, isNonWorkingDay } = entry;
  if (!meals.trim()) {
    throw new Error("La descrizione dei pasti non può essere vuota.");
  }

  const userProfileString = buildUserProfileString(profile);

  const activityInstruction = isNonWorkingDay
    ? `ATTENZIONE: Questa è una GIORNATA NON LAVORATIVA. Lo "Stile di vita lavorativo" del profilo non si applica. Considera il livello di attività base di oggi come 'Sedentario'. L'analisi del dispendio energetico deve basarsi SOLO sull'attività fisica esplicitamente registrata.`
    : `IMPORTANTE: Nel calcolare il fabbisogno calorico e nel formulare il riassunto, considera lo "Stile di vita lavorativo" del profilo utente come il livello di attività di base per una giornata tipo. L'"Attività fisica" registrata per il giorno è un'aggiunta (o una specificazione) a quel livello di base. Ad esempio, uno "Stile di vita: Attivo" implica un alto dispendio energetico di base, e l'attività del giorno (anche se "Nulla") si considera in aggiunta a quello.`;


  const prompt = `
    Analizza i seguenti pasti e attività fisica in base al profilo utente fornito.
    La tua analisi deve essere in ITALIANO e strettamente personalizzata.
    Fornisci un'analisi nutrizionale dettagliata in formato JSON.

    ${activityInstruction}

    Nel campo 'summary', commenta la giornata alimentare in relazione all'attività fisica *complessiva* (stile di vita di base + attività del giorno) e, soprattutto, in relazione agli obiettivi e alle condizioni dell'utente (es. se è in linea con l'obiettivo di perdita peso, se rispetta le restrizioni vegane, etc.). Sii incoraggiante e offri un consiglio specifico basato sui dati.
    
    Profilo Utente:
    ${userProfileString}

    Dati del giorno:
    Pasti: ${meals}
    Attività fisica: ${activity || 'Nessuna attività fisica registrata.'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: dailyAnalysisSchema,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error analyzing daily meals:", error);
    throw new Error("Impossibile ottenere l'analisi nutrizionale. Il modello AI potrebbe essere temporaneamente non disponibile.");
  }
};

export const generatePeriodAnalysis = async (entries: DailyEntry[], period: 'settimanale' | 'mensile' | 'annuale', profile: UserProfile) => {
    if (entries.length === 0) {
        return "Nessun dato disponibile per questo periodo per generare un'analisi.";
    }

    const aggregatedData = entries.map(entry => {
        const nonWorkingInfo = entry.isNonWorkingDay ? " (GIORNATA NON LAVORATIVA)" : "";
        const micronutrientsInfo = entry.analysis?.micronutrients?.length
            ? `Micronutrienti Rilevati: ${entry.analysis.micronutrients.join(', ')}`
            : 'Micronutrienti Rilevati: Nessuna analisi AI per questo giorno.';
        return `Data: ${entry.date}${nonWorkingInfo}\nPasti: ${entry.meals || 'Nessuno'}\nAttività fisica: ${entry.activity || 'Nessuna'}\n${micronutrientsInfo}`
    }).join('\n\n');

    const userProfileString = buildUserProfileString(profile);

    let micronutrientInstruction = '';
    if (period === 'mensile' || period === 'annuale') {
        micronutrientInstruction = `
        6.  **Bilancio dei Micronutrienti Chiave**: Basandoti sui dati dei "Micronutrienti Rilevati" giorno per giorno, crea un'analisi specifica. Valuta, in funzione del profilo utente (es. sesso, età, obiettivi), se emergono possibili carenze o eccessi ricorrenti (es. poco Ferro, troppo Sodio). Fornisci un breve paragrafo con osservazioni e consigli pratici. Se i dati sui micronutrienti sono scarsi o assenti, menzionalo e incoraggia l'utente a usare più spesso l'analisi giornaliera.
        `;
    }

    const prompt = `
        Basandomi sul seguente diario alimentare e sul profilo utente, fornisci un'analisi ${period} dettagliata, costruttiva e personalizzata in ITALIANO.

        Profilo Utente:
        ${userProfileString}

        IMPORTANTE: Quando analizzi l'attività fisica, presta attenzione ai giorni segnati come "(GIORNATA NON LAVORATIVA)". In questi giorni, lo "Stile di vita lavorativo" del profilo NON si applica e il livello di attività di base è da considerarsi sedentario. L'analisi deve tenere conto di questa variabilità per valutare la coerenza complessiva dell'attività fisica rispetto agli obiettivi dell'utente.

        Nel tuo report, includi i seguenti punti in ordine:
        1.  Un riassunto generale delle abitudini alimentari e di attività fisica (considerando la differenza tra giorni lavorativi e non) in relazione agli obiettivi.
        2.  Punti di forza (es. buon apporto proteico, costanza nell'attività fisica nei giorni di riposo).
        3.  Aree di miglioramento (es. eccesso di calorie nei weekend che rema contro la perdita di peso).
        4.  Suggerimenti pratici e personalizzati per il prossimo periodo.
        5.  Una nota incoraggiante finale che motivi l'utente a continuare.
        ${micronutrientInstruction}

        Diario del periodo:
        ${aggregatedData}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating period analysis:", error);
        throw new Error("Impossibile generare l'analisi del periodo. Il modello AI potrebbe essere temporaneamente non disponibile.");
    }
};