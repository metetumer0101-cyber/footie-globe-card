import { ExternalLink, AlertCircle } from "lucide-react";
import type { NewsArticle } from "@/types/news";
import { cn } from "@/lib/utils";

interface NewsCardProps {
  article: NewsArticle;
  className?: string;
}

export function NewsCard({ article, className }: NewsCardProps) {
  const handleClick = () => {
    if (article.link) {
      window.open(article.link, "_blank");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!article.link}
      className={cn(
        "card-surface group flex flex-col gap-3 overflow-hidden rounded-2xl transition-all hover:bg-secondary/40 active:scale-95 disabled:opacity-50",
        className
      )}
    >
      {/* Image */}
      {article.image ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-secondary/50">
          <img
            src={article.image}
            alt={article.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Source */}
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            {article.source}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-left text-sm font-bold leading-tight">
          {article.title}
        </h3>

        {/* Summary */}
        <p className="line-clamp-2 text-left text-xs text-muted-foreground">
          {article.summary}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[10px] text-muted-foreground">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("tr-TR", {
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </span>
          {article.link && (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          )}
        </div>
      </div>
    </button>
  );
}

interface NewsGridProps {
  articles: NewsArticle[];
  isLoading?: boolean;
}

export function NewsGrid({ articles, isLoading }: NewsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="card-surface h-72 animate-pulse rounded-2xl bg-secondary/30"
          />
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-secondary/20 py-12">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Bu ülke için haber bulunamadı. Lütfen daha sonra tekrar deneyin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
