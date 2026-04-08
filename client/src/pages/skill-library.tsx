import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Boxes, Search, Zap, BarChart3, MessageSquare, Settings } from "lucide-react";
import type { Skill } from "@shared/schema";

const categoryConfig: Record<string, { color: string; icon: any; bgIcon: string }> = {
  financial: { color: "bg-emerald-500/10 text-emerald-400", icon: Zap, bgIcon: "bg-emerald-500/10" },
  operational: { color: "bg-cyan-500/10 text-cyan-400", icon: Settings, bgIcon: "bg-cyan-500/10" },
  analytical: { color: "bg-purple-500/10 text-purple-400", icon: BarChart3, bgIcon: "bg-purple-500/10" },
  communication: { color: "bg-amber-500/10 text-amber-400", icon: MessageSquare, bgIcon: "bg-amber-500/10" },
};

const categories = ["all", "financial", "operational", "analytical", "communication"];

export default function SkillLibrary() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: skills, isLoading } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
    refetchInterval: 10000,
  });

  if (isLoading || !skills) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const filtered = skills.filter((s) => {
    const matchCategory = filter === "all" || s.category === filter;
    const matchSearch =
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, Skill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" data-testid="skill-library">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Boxes className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-semibold text-foreground">Skill Library</h1>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Composable capabilities — {skills.length} skills available
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" data-testid="skill-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-card-border rounded-md pl-9 pr-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-colors"
            data-testid="skill-search"
          />
        </div>
        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === cat
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-testid={`filter-${cat}`}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Grid by Category */}
      {Object.entries(grouped).map(([category, catSkills]) => {
        const config = categoryConfig[category] || categoryConfig.operational;
        return (
          <div key={category}>
            <h2 className="text-[12px] font-semibold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.color.split(" ")[0].replace("/10", "")}`} style={{
                backgroundColor: category === "financial" ? "hsl(160 60% 45%)"
                  : category === "operational" ? "hsl(187 85% 48%)"
                  : category === "analytical" ? "hsl(270 60% 55%)"
                  : "hsl(38 92% 50%)"
              }} />
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {catSkills.map((skill) => {
                const CatIcon = config.icon;
                return (
                  <div
                    key={skill.id}
                    className="bg-card border border-card-border rounded-lg p-4"
                    data-testid={`skill-${skill.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md ${config.bgIcon} flex items-center justify-center`}>
                          <CatIcon className="w-3.5 h-3.5" style={{
                            color: category === "financial" ? "hsl(160 60% 45%)"
                              : category === "operational" ? "hsl(187 85% 48%)"
                              : category === "analytical" ? "hsl(270 60% 55%)"
                              : "hsl(38 92% 50%)"
                          }} />
                        </div>
                        <h3 className="text-[12px] font-medium text-foreground">{skill.name}</h3>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${config.color}`}>
                        {category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">
                      {skill.description}
                    </p>

                    {/* Complexity meter */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Complexity</span>
                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                          {(skill.complexity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${skill.complexity * 100}%`,
                            backgroundColor: skill.complexity > 0.7 ? "hsl(0 72% 51%)" : skill.complexity > 0.4 ? "hsl(38 92% 50%)" : "hsl(160 60% 45%)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        <span className="font-mono tabular-nums text-foreground">{skill.usageCount}</span> uses
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-mono tabular-nums text-foreground">{(skill.successRate * 100).toFixed(1)}%</span> success
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-[12px]">
          No skills match your filters.
        </div>
      )}
    </div>
  );
}
