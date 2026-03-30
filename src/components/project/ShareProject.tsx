import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Loader2, X, UserPlus } from "lucide-react";

interface ShareProjectProps {
  projectId: string;
  isOwner: boolean;
}

const ShareProject = ({ projectId, isOwner }: ShareProjectProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["project_shares", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_shares" as any)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  // Fetch display names for shared users
  const { data: sharedProfiles = [] } = useQuery({
    queryKey: ["shared_profiles", shares.map((s: any) => s.shared_with_user_id)],
    queryFn: async () => {
      if (shares.length === 0) return [];
      const userIds = shares.map((s: any) => s.shared_with_user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      if (error) return [];
      return data;
    },
    enabled: shares.length > 0,
  });

  const handleAdd = async () => {
    if (!email.trim() || !user) return;
    setAdding(true);
    try {
      // Find user by email via profiles display_name or by looking up auth
      // We need to find the user_id from the email. We'll look in profiles.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("display_name", email.trim())
        .maybeSingle();

      // If not found by display_name, the display_name might be set to email on signup
      let targetUserId = profile?.user_id;

      if (!targetUserId) {
        // Try searching profiles where display_name matches the email
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .ilike("display_name", email.trim());
        
        if (profiles && profiles.length > 0) {
          targetUserId = profiles[0].user_id;
        }
      }

      if (!targetUserId) {
        toast({ title: "Usuário não encontrado", description: "Nenhum usuário cadastrado com esse email.", variant: "destructive" });
        setAdding(false);
        return;
      }

      if (targetUserId === user.id) {
        toast({ title: "Erro", description: "Você não pode compartilhar consigo mesmo.", variant: "destructive" });
        setAdding(false);
        return;
      }

      const { error } = await supabase
        .from("project_shares" as any)
        .insert({
          project_id: projectId,
          shared_with_user_id: targetUserId,
          shared_by_user_id: user.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Já compartilhado", description: "Este projeto já está compartilhado com esse usuário.", variant: "destructive" });
        } else {
          throw error;
        }
        setAdding(false);
        return;
      }

      toast({ title: "Compartilhado! ✅" });
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["project_shares", projectId] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    const { error } = await supabase
      .from("project_shares" as any)
      .delete()
      .eq("id", shareId);
    if (error) {
      toast({ title: "Erro", description: "Falha ao remover compartilhamento.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["project_shares", projectId] });
    toast({ title: "Removido" });
  };

  const getDisplayName = (userId: string) => {
    const p = sharedProfiles.find((p: any) => p.user_id === userId);
    return p?.display_name || userId.slice(0, 8) + "...";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors relative"
          title="Compartilhar projeto"
        >
          <Users size={16} />
          {shares.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
              {shares.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} /> Compartilhar Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email do usuário..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={adding || !email.trim()} size="sm">
                {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum compartilhamento ainda.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Membros ({shares.length})</p>
              {shares.map((share: any) => (
                <div key={share.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary">
                  <span className="text-sm text-foreground truncate">
                    {getDisplayName(share.shared_with_user_id)}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(share.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProject;
