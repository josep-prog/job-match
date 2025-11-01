import { Database } from "@/integrations/supabase/types";

// Export commonly used types for easier access
export type UserRole = Database["public"]["Enums"]["app_role"];
export type CompanyStatus = Database["public"]["Enums"]["company_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];

// Insert types for creating new records
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type UserRoleInsert = Database["public"]["Tables"]["user_roles"]["Insert"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

// Update types for updating records
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type UserRoleUpdate = Database["public"]["Tables"]["user_roles"]["Update"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];
export type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];
