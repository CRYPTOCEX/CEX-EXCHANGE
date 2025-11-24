import { FC, MouseEventHandler } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

type CustomDocument = Document & {
  mozCancelFullScreen?: () => void;
};

const FullScreenToggle: FC = () => {
  const t = useTranslations("components/partials/header/full-screen");
  const toggleFullScreen: MouseEventHandler<HTMLButtonElement> = () => {
    const doc = document;
    const docEl = doc.documentElement;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.requestFullscreen ||
      docEl.requestFullscreen ||
      docEl.requestFullscreen;
    const cancelFullScreen =
      doc.exitFullscreen ||
      (doc as CustomDocument).mozCancelFullScreen ||
      doc.exitFullscreen ||
      doc.exitFullscreen;

    if (
      !doc.fullscreenElement &&
      !doc.fullscreenElement &&
      !doc.fullscreenElement &&
      !doc.fullscreenElement
    ) {
      requestFullScreen?.call(docEl);
    } else {
      cancelFullScreen?.call(doc);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleFullScreen}
            variant="ghost"
            size="icon"
            className="relative md:h-9 md:w-9 h-8 w-8 hover:bg-muted dark:hover:bg-muted data-[state=open]:bg-muted dark:data-[state=open]:bg-muted hover:text-primary text-foreground dark:text-foreground rounded-full"
          >
            <Icon icon="bi:arrows-fullscreen" className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("full_screen")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FullScreenToggle;
