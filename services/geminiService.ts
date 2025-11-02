import { GoogleGenAI, Type } from "@google/genai";
import type { DailyEntry, UserProfile, PeriodAnalysis } from '../types';

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

const periodAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "Un riassunto generale delle abitudini alimentari e di attività fisica in relazione agli obiettivi." },
        strengths: { type: Type.STRING, description: "Punti di forza emersi nel periodo (es. buon apporto proteico, costanza)." },
        improvements: { type: Type.STRING, description: "Aree di miglioramento identificate (es. eccesso di calorie nei weekend)." },
        suggestions: { type: Type.STRING, description: "Suggerimenti pratici e personalizzati per il prossimo periodo." },
        encouragement: { type: Type.STRING, description: "Una nota incoraggiante finale per motivare l'utente." },
        micronutrientsAnalysis: { type: Type.STRING, description: "Analisi del bilancio dei micronutrienti chiave (solo per report mensili/annuali). Se i dati sono scarsi, menzionarlo qui." },
    },
    required: ["summary", "strengths", "improvements", "suggestions", "encouragement"],
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

export const generatePeriodAnalysis = async (entries: DailyEntry[], period: 'settimanale' | 'mensile' | 'annuale', profile: UserProfile): Promise<PeriodAnalysis | string> => {
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
        **Bilancio dei Micronutrienti Chiave**: Basandoti sui dati dei "Micronutrienti Rilevati" giorno per giorno, crea un'analisi specifica nel campo 'micronutrientsAnalysis'. Valuta, in funzione del profilo utente, se emergono possibili carenze o eccessi ricorrenti. Se i dati sono scarsi, menzionalo e incoraggia l'utente.
        `;
    } else {
        micronutrientInstruction = `Il campo 'micronutrientsAnalysis' non è richiesto per l'analisi settimanale e può essere omesso.`;
    }

    const prompt = `
        Basandomi sul seguente diario alimentare e sul profilo utente, fornisci un'analisi ${period} dettagliata, costruttiva e personalizzata in ITALIANO, strutturata come un oggetto JSON.

        Profilo Utente:
        ${userProfileString}

        IMPORTANTE: Quando analizzi l'attività fisica, presta attenzione ai giorni segnati come "(GIORNATA NON LAVORATIVA)". In questi giorni, lo "Stile di vita lavorativo" del profilo NON si applica.

        Popola i campi del JSON come segue:
        -   'summary': Un riassunto generale delle abitudini.
        -   'strengths': I punti di forza.
        -   'improvements': Le aree di miglioramento.
        -   'suggestions': Suggerimenti pratici e personalizzati.
        -   'encouragement': Una nota incoraggiante finale.
        ${micronutrientInstruction}

        Diario del periodo:
        ${aggregatedData}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: periodAnalysisSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PeriodAnalysis;
    } catch (error) {
        console.error("Error generating period analysis:", error);
        throw new Error("Impossibile generare l'analisi del periodo. Il modello AI potrebbe essere temporaneamente non disponibile.");
    }
};