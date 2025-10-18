import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Utensils, Heart, Store, Shield } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: "consumer",
      title: "Consumer",
      description: "Collect surplus food portions from local vendors",
      icon: Utensils,
      color: "primary",
      route: "/auth/consumer"
    },
    {
      id: "charitable_organisation",
      title: "Charitable Organisation",
      description: "Reserve and redistribute food to those in need",
      icon: Heart,
      color: "secondary",
      route: "/auth/organisation"
    },
    {
      id: "vendor",
      title: "Vendor",
      description: "Share your surplus food with the community",
      icon: Store,
      color: "accent",
      route: "/auth/vendor"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary shadow-primary mb-4">
            <Utensils className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            FoodConnect
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Bridging surplus food with those who need it most. Choose your role to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => navigate(role.route)}
              >
                <div className="space-y-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${role.color}/10`}>
                    <Icon className={`h-8 w-8 text-${role.color}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">{role.title}</h3>
                    <p className="text-muted-foreground">{role.description}</p>
                  </div>
                  <Button 
                    className="w-full group-hover:shadow-primary transition-shadow"
                    variant={role.color === "primary" ? "default" : "outline"}
                  >
                    Continue as {role.title}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
