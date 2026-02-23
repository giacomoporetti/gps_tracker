import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useBackend } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: z.string().min(2, "L'username deve contenere almeno 2 caratteri."),
  boatName: z.string().min(2, "Il nome della barca deve contenere almeno 2 caratteri."),
  boatCategory: z.string().min(2, "La categoria della barca deve contenere almeno 2 caratteri."),
  boatRating: z.coerce.number().min(1, "La valutazione della barca deve essere di almeno 1."),
});

export default function ProfilePage() {
  const { user } = useInternetIdentity();
  const { backend } = useBackend();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      boatName: "",
      boatCategory: "",
      boatRating: 1,
    },
  });

  useEffect(() => {
    if (backend && user) {
      backend.getCallerUserProfile().then((profile) => {
        if (profile.Ok) {
          form.reset({
            username: profile.Ok.username,
            boatName: profile.Ok.boatName,
            boatCategory: profile.Ok.boatCategory,
            boatRating: Number(profile.Ok.boatRating),
          });
        }
      });
    }
  }, [backend, user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!backend) return;

    setIsSaving(true);
    try {
      await backend.saveCallerUserProfile({
        username: values.username,
        email: user?.email ?? "",
        boatName: values.boatName,
        boatCategory: values.boatCategory,
        boatRating: BigInt(values.boatRating),
      });

      toast({
        title: "Profilo Salvato!",
        description: "Il tuo profilo è stato aggiornato con successo.",
      });

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Si è verificato un errore",
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Completa il tuo profilo</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Il tuo username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="boatName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome della barca</FormLabel>
                <FormControl>
                  <Input placeholder="Il nome della tua barca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="boatCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria della barca</FormLabel>
                <FormControl>
                  <Input placeholder="La categoria della tua barca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="boatRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valutazione della barca</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="La valutazione della tua barca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Salva"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
