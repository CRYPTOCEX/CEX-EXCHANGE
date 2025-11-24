"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
interface FeaturedProject {
  id: string;
  name: string;
  image: string;
  description: string;
  raised: string;
  target: string;
  progress: number;
}
export function FeaturedProjects() {
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    $fetch<{
      projects: FeaturedProject[];
    }>({
      url: "/api/ico/offer/featured",
      silent: true,
    })
      .then((res) => {
        if (isMounted) {
          if (res.data && Array.isArray(res.data.projects)) {
            setProjects(res.data.projects);
          } else if (res.data && Array.isArray(res.data)) {
            setProjects(res.data);
          } else {
            setProjects([]);
          }
          setError(res.error);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || "Failed to load featured projects.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);
  return (
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
            Trending Now
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Featured Projects
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Discover our handpicked selection of innovative token offerings
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40 text-lg text-muted-foreground">
            Loading featured projects...
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-40 text-destructive">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-muted-foreground">
            No featured projects found.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 mt-10">
            {projects.map((project) => {
              return (
                <div
                  key={project.id}
                  className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg"
                >
                  <div className="aspect-video w-full overflow-hidden">
                    <Image
                      src={project.image || "/img/placeholder.svg"}
                      alt={project.name}
                      width={600}
                      height={400}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold">{project.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Raised</p>
                        <p className="font-bold">
                          {project.raised}
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            / {project.target}
                          </span>
                        </p>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-6">
                      {project.description}
                    </p>

                    <div className="w-full h-2 bg-muted rounded-full mb-4">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm">
                        <span className="font-medium">{project.progress}%</span>{" "}
                        completed
                      </p>
                      <Link href={`/ico/offer/${project.id}`}>
                        <Button variant="outline" size="sm">
                          View Project
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center mt-10">
          <Link href="/ico/offer">
            <Button size="lg">
              Explore All Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
