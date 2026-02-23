import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useBackend } from '@/hooks/useActor';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useEffect } from 'react';

const formSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters.'),
  boatName: z.string().min(2, 'Boat name must be at least 2 characters.'),
  boatCategory: z.string().min(2, 'Boat category must be at least 2 characters.'),
  boatRating: z.coerce.number().min(1, 'Boat rating must be at least 1.'),
});

export default function ProfilePage() {
  const { whoami, user, principal } = useInternetIdentity();
  const { backend } = useBackend();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      boatName: '',
      boatCategory: '',
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (backend) {
      backend
        .saveCallerUserProfile({
          username: values.username,
          email: user?.email ?? '',
          boatName: values.boatName,
          boatCategory: values.boatCategory,
          boatRating: BigInt(values.boatRating),
        })
        .then(() => {
          window.location.href = '/';
        });
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Complete Your Profile</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Your username" {...field} />
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
                <FormLabel>Boat Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your boat's name" {...field} />
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
                <FormLabel>Boat Category</FormLabel>
                <FormControl>
                  <Input placeholder="Your boat's category" {...field} />
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
                <FormLabel>Boat Rating</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Your boat's rating" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Save</Button>
        </form>
      </Form>
    </div>
  );
}
