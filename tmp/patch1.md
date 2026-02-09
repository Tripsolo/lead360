**PATCH 1: Give Stage 3 Access to the Knowledge Base**

**Problem**  
The buildStage3Prompt() function in nba-framework.ts generates talking points and NBA recommendations but NEVER receives tower inventory data, competitor pricing data, or project metadata. It only receives the Stage 2 analysis result, extracted signals, and raw visit comments. When it writes competitor prices or possession dates in talking points, it hallucinates from static example text in the TALKING\_POINTS constant definitions.

**What to Change**  
**Step 1**: Add a new helper function formatKBForStage3 in nba-framework.ts  
Insert this function BEFORE the buildStage3Prompt function. This function takes tower inventory, competitor pricing, and project metadata arrays and formats them into a markdown table string suitable for prompt injection.  
The function should:

Accept 3 parameters: towerInventory: any\[\], competitorPricing: any\[\], projectMetadata: any  
Format tower inventory as a markdown table with columns: Project, Tower, Typology, Carpet (sqft), Closing Price (Cr), OC Date, Unsold  
Map project\_id values to readable names (eternia → "Eternia", primera → "Primera", estella → "Estella", immensa → "Immensa")  
Format competitor pricing as a markdown table with columns: Competitor, Project, Config, Carpet (sqft), Price (Lakhs), PSF, vs Eternia  
Convert price\_min\_av and price\_max\_av from raw numbers to Lakhs format (divide by 100000\)  
Include key project facts from projectMetadata (project name, township area, GCP area, configurations)  
End with a CRITICAL RULE instruction: "When contextualizing talking points, use ONLY numbers from the tables above. NEVER use example numbers from the framework talking point definitions."

**Step 2**: Update buildStage3Prompt signature in nba-framework.ts  
Change the function signature from:  
typescriptexport function buildStage3Prompt(  
  stage2Result: any,  
  extractedSignals: any,  
  visitComments: string  
): string {  
To:  
typescriptexport function buildStage3Prompt(  
  stage2Result: any,  
  extractedSignals: any,  
  visitComments: string,  
  towerInventory?: any\[\],  
  competitorPricing?: any\[\],  
  projectMetadata?: any  
): string {  
**Step 3**: Call formatKBForStage3 inside buildStage3Prompt and inject output into the prompt  
Inside the function, after the existing safetySection variable is built, add:  
typescriptconst kbSection \= (towerInventory && competitorPricing)   
  ? formatKBForStage3(towerInventory, competitorPricing, projectMetadata)  
  : "";  
Then in the final return template literal, insert ${kbSection} between ${safetySection} and ${frameworkSection}.  
**Step 4**: Update BOTH call sites in index.ts  
In index.ts, search for ALL calls to buildStage3Prompt. There are exactly 2 occurrences — one in the primary Stage 3 block (Gemini 3 Flash) and one in the fallback block (Gemini 2.5 Flash).  
For BOTH, change from:  
typescriptconst stage3Prompt \= buildStage3Prompt(  
  analysisResult,  
  extractedSignals,  
  visitComments  // or lead.rawData?.\["Visit Comments"\] || ""  
);  
To:  
typescriptconst stage3Prompt \= buildStage3Prompt(  
  analysisResult,  
  extractedSignals,  
  visitComments,  // or lead.rawData?.\["Visit Comments"\] || ""  
  towerInventory || \[\],  
  competitorPricing || \[\],  
  projectMetadata  
);  
The variables towerInventory, competitorPricing, and projectMetadata are already available in scope — they're fetched from Supabase earlier in the function (look for const { data: towerInventory } and const { data: competitorPricing }).  
Verification  
After this change, Stage 3 talking points should reference actual numbers from the database instead of hallucinated values. Test by running analysis on a lead and checking if competitor prices in talking points match the competitor\_pricing table data.

Patch 1 code:

// \============================================================  
// PATCH 1: nba-framework.ts — buildStage3Prompt()  
//   
// WHAT: Add knowledge base parameters (towerInventory,   
//       competitorPricing, projectMetadata) to buildStage3Prompt  
//       and inject formatted KB data into the prompt.  
//  
// WHY:  Stage 3 currently generates talking points WITHOUT access  
//       to actual inventory/pricing data. It relies on static text  
//       in TALKING\_POINTS definitions, causing factually incorrect  
//       competitor prices, wrong possession dates, and hallucinated  
//       inventory numbers.  
// \============================================================

// \---- CHANGE 1a: Update function signature \----  
//   
// FIND this function signature (around line \~780):  
//  
//   export function buildStage3Prompt(  
//     stage2Result: any,  
//     extractedSignals: any,  
//     visitComments: string  
//   ): string {  
//  
// REPLACE WITH:

export function buildStage3Prompt(  
  stage2Result: any,  
  extractedSignals: any,  
  visitComments: string,  
  towerInventory?: any\[\],  
  competitorPricing?: any\[\],  
  projectMetadata?: any  
): string {

// \---- CHANGE 1b: Add KB formatting helper (insert BEFORE buildStage3Prompt) \----  
//   
// INSERT this new function BEFORE the buildStage3Prompt function:

function formatKBForStage3(  
  towerInventory: any\[\],  
  competitorPricing: any\[\],  
  projectMetadata: any  
): string {  
  let kb \= \`\\n\# KNOWLEDGE BASE (SOURCE OF TRUTH \- Use for all numbers)\\n\`;  
    
  // Format Eternia inventory summary  
  if (towerInventory && towerInventory.length \> 0\) {  
    kb \+= \`\\n\#\# ETERNIA & SISTER PROJECT INVENTORY\\n\`;  
    kb \+= \`| Project | Tower | Typology | Carpet (sqft) | Closing Price (Cr) | OC Date | Unsold |\\n\`;  
    kb \+= \`|---------|-------|----------|---------------|-------------------|---------|--------|\\n\`;  
      
    for (const row of towerInventory) {  
      const projectName \= row.project\_id?.toLowerCase().includes("eternia") ? "Eternia" :  
                         row.project\_id?.toLowerCase().includes("primera") ? "Primera" :  
                         row.project\_id?.toLowerCase().includes("estella") ? "Estella" :  
                         row.project\_id?.toLowerCase().includes("immensa") ? "Immensa" : row.project\_id;  
      const carpet \= row.carpet\_sqft\_min && row.carpet\_sqft\_max   
        ? \`${row.carpet\_sqft\_min}-${row.carpet\_sqft\_max}\`   
        : row.carpet\_sqft\_min || row.carpet\_sqft\_max || "N/A";  
      const closingMin \= row.closing\_min\_cr ? \`₹${row.closing\_min\_cr.toFixed(2)}\` : "N/A";  
      const closingMax \= row.closing\_max\_cr ? \`₹${row.closing\_max\_cr.toFixed(2)}\` : "N/A";  
      kb \+= \`| ${projectName} | ${row.tower || "?"} | ${row.typology || "N/A"} | ${carpet} | ${closingMin}-${closingMax} | ${row.oc\_date || "TBD"} | ${row.unsold ?? "N/A"} |\\n\`;  
    }  
  }  
    
  // Format competitor pricing  
  if (competitorPricing && competitorPricing.length \> 0\) {  
    kb \+= \`\\n\#\# COMPETITOR PRICING (Use these numbers, NOT framework examples)\\n\`;  
    kb \+= \`| Competitor | Project | Config | Carpet (sqft) | Price (Lakhs) | PSF | vs Eternia |\\n\`;  
    kb \+= \`|------------|---------|--------|---------------|---------------|-----|------------|\\n\`;  
      
    for (const row of competitorPricing) {  
      const carpet \= row.carpet\_sqft\_min && row.carpet\_sqft\_max   
        ? \`${row.carpet\_sqft\_min}-${row.carpet\_sqft\_max}\`   
        : row.carpet\_sqft\_min || row.carpet\_sqft\_max || "N/A";  
      const priceMin \= row.price\_min\_av ? \`₹${(row.price\_min\_av / 100000).toFixed(0)}L\` : "N/A";  
      const priceMax \= row.price\_max\_av ? \`₹${(row.price\_max\_av / 100000).toFixed(0)}L\` : "N/A";  
      kb \+= \`| ${row.competitor\_name || "?"} | ${row.project\_name || "N/A"} | ${row.config || "N/A"} | ${carpet} | ${priceMin}-${priceMax} | ₹${row.avg\_psf?.toLocaleString() || "N/A"} | ${row.vs\_eternia || "N/A"} |\\n\`;  
    }  
  }  
    
  // Format key project facts  
  if (projectMetadata) {  
    kb \+= \`\\n\#\# KEY PROJECT FACTS\\n\`;  
    kb \+= \`- Project: ${projectMetadata.project\_name || "Kalpataru Parkcity Eternia"}\\n\`;  
    kb \+= \`- Township: ${projectMetadata.township?.total\_area\_acres || 100} acres\\n\`;  
    kb \+= \`- Grand Central Park: ${projectMetadata.township?.grand\_central\_park?.area\_acres || 20.5} acres\\n\`;  
    kb \+= \`- Towers in Eternia: 10\\n\`;  
      
    if (projectMetadata.inventory?.configurations) {  
      kb \+= \`\\n\#\#\# Eternia Configurations:\\n\`;  
      for (const config of projectMetadata.inventory.configurations) {  
        kb \+= \`- ${config.type}: ${config.carpet\_sqft\_range?.\[0\]}-${config.carpet\_sqft\_range?.\[1\]} sqft, ₹${config.price\_range\_cr?.\[0\]}-${config.price\_range\_cr?.\[1\]} Cr\\n\`;  
      }  
    }  
  }  
    
  kb \+= \`\\n\#\# CRITICAL RULE: When contextualizing talking points, use ONLY numbers from the tables above. NEVER use example numbers from the framework talking point definitions.\\n\`;  
    
  return kb;  
}

// \---- CHANGE 1c: Inject KB data into the prompt \----  
//  
// Inside buildStage3Prompt(), FIND this line (around line \~870):  
//  
//   return \`${systemPrompt}  
//     
//   ${inputDataSection}  
//     
//   ${safetySection}  
//     
//   ${frameworkSection}  
//     
//   ${instructionsSection}  
//     
//   ${outputStructure}\`;  
//  
// REPLACE WITH:

  // Build KB section if data available  
  const kbSection \= (towerInventory && competitorPricing)   
    ? formatKBForStage3(towerInventory, competitorPricing, projectMetadata)  
    : "";

  return \`${systemPrompt}

${inputDataSection}

${safetySection}

${kbSection}

${frameworkSection}

${instructionsSection}

${outputStructure}\`;  
// \============================================================  
// PATCH 1 (continued): index.ts — Stage 3 call sites  
//  
// WHAT: Pass towerInventory, competitorPricing, and projectMetadata  
//       to the buildStage3Prompt() calls.  
//  
// There are TWO call sites for buildStage3Prompt in index.ts  
// (primary Gemini 3 Flash \+ fallback Gemini 2.5 Flash).  
// Both must be updated.  
// \============================================================

// \---- CHANGE 1d: Primary Stage 3 call \----  
//  
// FIND (around the section labeled "Stage 3: NBA & TALKING POINTS GENERATION"):  
//  
//   const stage3Prompt \= buildStage3Prompt(  
//     analysisResult,  
//     extractedSignals,  
//     visitComments  
//   );  
//  
// REPLACE WITH (there are TWO occurrences — update BOTH):

          const stage3Prompt \= buildStage3Prompt(  
            analysisResult,  
            extractedSignals,  
            visitComments,  
            towerInventory || \[\],  
            competitorPricing || \[\],  
            projectMetadata  
          );

// NOTE: The second occurrence is in the fallback block:  
//  
//   } catch (stage3PrimaryError) {  
//     ...  
//     const stage3Prompt \= buildStage3Prompt(  
//       analysisResult,  
//       extractedSignals,  
//       lead.rawData?.\["Visit Comments"\] || ""  
//     );  
//  
// REPLACE that one too WITH:

            const stage3Prompt \= buildStage3Prompt(  
              analysisResult,  
              extractedSignals,  
              lead.rawData?.\["Visit Comments"\] || "",  
              towerInventory || \[\],  
              competitorPricing || \[\],  
              projectMetadata  
            );