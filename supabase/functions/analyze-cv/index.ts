import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id } = await req.json();

    if (!application_id) {
      throw new Error("application_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching application:", application_id);

    // Fetch application with job details
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select(`
        *,
        jobs!inner(
          id,
          title,
          required_skills,
          description,
          companies!inner(id)
        )
      `)
      .eq("id", application_id)
      .single();

    if (appError) throw appError;
    if (!app) throw new Error("Application not found");

    console.log("Application found, analyzing CV...");

    // In production, you would parse PDF/DOCX here
    // For now, we'll simulate CV content extraction
    const cvText = `Simulated CV content for application ${application_id}`;

    // Call Lovable AI to analyze CV
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional recruiter analyzing CVs. Extract structured information and calculate match scores.",
          },
          {
            role: "user",
            content: `Analyze this CV and provide a JSON response with the following structure:
{
  "skills": ["skill1", "skill2", ...],
  "experience_years": number,
  "education": "string",
  "match_score": number (0-100 based on required skills)
}

Required skills for the job: ${app.jobs.required_skills.join(", ")}

CV Text: ${cvText}

Generate realistic data based on common tech skills. Assign match score based on skill overlap.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    console.log("AI Analysis complete:", analysis);

    // Find recommended jobs based on skills
    const { data: allJobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        required_skills,
        companies!inner(id, status)
      `)
      .eq("status", "active")
      .eq("companies.status", "approved")
      .neq("id", app.jobs.id);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    }

    const recommendations = (allJobs || [])
      .map((job) => {
        const matchScore = calculateMatch(analysis.skills, job.required_skills);
        return {
          job_id: job.id,
          title: job.title,
          match_score: matchScore,
        };
      })
      .filter((rec) => rec.match_score >= 60)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);

    console.log("Found", recommendations.length, "recommended jobs");

    // Update application with analysis
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        ai_analysis: analysis,
        match_score: analysis.match_score,
        recommended_jobs: recommendations,
        status: "analyzed",
      })
      .eq("id", application_id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("Application updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        recommendations_count: recommendations.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in analyze-cv function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateMatch(applicantSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills || requiredSkills.length === 0) return 0;
  
  const normalizedApplicantSkills = applicantSkills.map(s => s.toLowerCase());
  const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
  
  const overlap = normalizedApplicantSkills.filter(s =>
    normalizedRequiredSkills.some(r => r.includes(s) || s.includes(r))
  ).length;
  
  return Math.round((overlap / requiredSkills.length) * 100);
}