"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Eye,
  FileText,
  ImageIcon,
  Link2,
  Save,
  Tag as TagIcon,
  Type,
  User,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { imageUploader } from "@/utils/upload";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

import { EditorBarDivider, EditorShell } from "@/components/layout/editor-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import { SafeHtml } from "@/app/[locale]/(dashboard)/admin/builder/components/shared/safe-html";

/**
 * The blog post editor — one component, two mounts.
 *
 * WHY IT IS SHARED
 * ----------------
 * Writing a post used to mean two unrelated experiences. `/admin/blog/post`
 * drove creation through the generic `DataTable` form — a stack of labelled
 * inputs with the WYSIWYG body squeezed into the same column as the slug — and
 * `/blog/author/manage` had a hand-built tabbed page that hid the featured
 * image, the tags and the category behind three separate tabs, so nothing about
 * a post was ever visible at once. Same object, same fields, two layouts that
 * agreed on nothing.
 *
 * This is that one screen: body copy in the wide column, and every decision
 * about the post (publish state, author, category, tags, cover image) in a
 * sidebar that stays on screen while you write.
 *
 * It is a TRUE full-page app surface, not a page with the nav hidden. Both
 * segment layouts — `(blog)/admin/layout.tsx` and `(blog)/blog/layout.tsx` —
 * carry a `CHROMELESS` list that returns bare children for these four routes,
 * so no site header, nav or footer is ever mounted; the editor then owns the
 * viewport through `EditorShell` and renders its own `h-12` bar. The two lists
 * must stay in sync: the two scopes are one component and cannot disagree
 * about their frame.
 *
 * WHAT DIFFERS BETWEEN THE TWO SCOPES
 * -----------------------------------
 * Only the endpoints, the return path, and whether the author is a choice: an
 * admin picks any approved author, an author is implicitly themselves. Every
 * other difference that used to exist between the two screens was accidental.
 */
export type PostEditorScope = "admin" | "author";

export interface PostEditorProps {
  scope: PostEditorScope;
  /** Present when editing; absent when creating. */
  postId?: string;
}

interface OptionItem {
  id: string;
  name: string;
}

interface PostFormState {
  title: string;
  slug: string;
  description: string;
  content: string;
  categoryId: string;
  authorId: string;
  status: string;
  image: string;
  tagNames: string[];
}

const EMPTY_FORM: PostFormState = {
  title: "",
  slug: "",
  description: "",
  content: "",
  categoryId: "",
  authorId: "",
  status: "DRAFT",
  image: "",
  tagNames: [],
};

/**
 * Mirrors `backend/src/utils/index.ts` `slugify` character for character.
 *
 * It has to: the field shows the author what the post's URL will be, and the
 * backend re-slugifies whatever arrives. A near-miss implementation here (one
 * that also trimmed leading dashes, say) would display one address and store
 * another.
 */
function slugify(value: string): string {
  return value
    .replace(/^\s+|\s+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Rough reading figures for the sidebar. HTML tags are not words. */
function readingStats(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return { words, minutes: Math.max(1, Math.round(words / 200)) };
}

const ENDPOINTS = {
  admin: {
    load: (id: string) => `/api/admin/blog/post/${id}`,
    create: "/api/admin/blog/post",
    update: (id: string) => `/api/admin/blog/post/${id}`,
    categories: "/api/admin/blog/category/options",
    tags: "/api/admin/blog/tag/options",
    authors: "/api/admin/blog/author/options",
    back: "/admin/blog/post",
  },
  author: {
    load: (id: string) => `/api/blog/author/manage/${id}`,
    create: "/api/blog/author/manage",
    update: (id: string) => `/api/blog/author/manage/${id}`,
    // `/api/blog/category` is the public BROWSE list, and it inner-joins posts
    // with `status: PUBLISHED` — a category with no published post is not in
    // it. Feeding the selector from that endpoint made every newly created
    // category unpickable forever: it needed a published post to appear, and
    // it could not receive one without first being pickable. `options` is the
    // unfiltered list, exactly as `tags` below already is.
    categories: "/api/blog/category/options",
    tags: "/api/blog/tag/options",
    authors: null,
    back: "/blog/author/manage",
  },
} as const;

/**
 * Save lives in the shell's top bar, which is OUTSIDE the `<form>` element, so
 * the button reaches it through the HTML form-owner attribute
 * (`<button form="...">`) rather than by being a descendant.
 *
 * Deliberately not `type="button" onClick={handleSubmit}`: that would also kill
 * Enter-to-submit from the title and slug inputs. A module constant rather than
 * `useId()` because only one editor is ever mounted at a time and the value has
 * to be a plain, selector-safe id.
 */
const FORM_ID = "post-editor-form";

export function PostEditor({ scope, postId }: PostEditorProps) {
  const t = useTranslations("common");
  const tBlog = useTranslations("blog_blog");
  const tAdmin = useTranslations("blog_admin");
  const router = useRouter();
  const { settings } = useConfigStore();

  const isEditing = Boolean(postId);
  const isAdmin = scope === "admin";
  const api = ENDPOINTS[scope];


  const [form, setForm] = useState<PostFormState>(EMPTY_FORM);
  const [post, setPost] = useState<any>(null);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  /** Set only when the category request itself failed — see the loader below. */
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<OptionItem[]>([]);
  const [tagOptions, setTagOptions] = useState<OptionItem[]>([]);

  const [featuredImage, setFeaturedImage] = useState<File | string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * The slug follows the title only until somebody types in the slug box, and
   * never on an existing post: silently rewriting a published post's URL
   * because its headline was reworded breaks every inbound link to it.
   */
  const slugTouched = useRef(false);

  /**
   * Save sits in the top bar now, so it can be pressed from anywhere in a long
   * article — including from a scroll position where the error alert at the top
   * of the form is nowhere near the viewport. Without this, a rejected save
   * (a duplicate slug, a missing field) looks exactly like a dead button.
   */
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [error]);

  const maxTags = useMemo(() => {
    const raw = Number(settings?.maxTagsPerPost);
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  }, [settings?.maxTagsPerPost]);

  const patch = useCallback((changes: Partial<PostFormState>) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setIsDirty(true);
  }, []);

  // ---------------------------------------------------------------- loading
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      // Cleared up front, or a previous failure's message stays on screen for
      // the whole of the retry that is meant to clear it.
      setCategoriesError(null);

      const requests: Promise<any>[] = [
        $fetch({ url: api.categories, silent: true }),
        $fetch({ url: api.tags, silent: true }),
        api.authors
          ? $fetch({ url: api.authors, silent: true })
          : Promise.resolve({ data: [] }),
        postId
          ? $fetch({ url: api.load(postId), silent: true })
          : Promise.resolve({ data: null }),
      ];

      const [categoryRes, tagRes, authorRes, postRes] =
        await Promise.all(requests);
      if (cancelled) return;

      /**
       * A failed category fetch and a genuinely empty category list produce
       * the same thing here — an empty array — and the selector below cannot
       * tell them apart. Keeping the error means "the list could not be
       * loaded" reads differently from "nobody has created a category yet",
       * which is the difference between a permission problem the operator can
       * fix and one they will never diagnose from a blank dropdown.
       */
      setCategoriesError(
        Array.isArray(categoryRes?.data) ? null : categoryRes?.error || null
      );
      setCategories(
        Array.isArray(categoryRes?.data)
          ? categoryRes.data.map((c: any) => ({
              id: String(c.id),
              name: c.name,
            }))
          : []
      );
      setTagOptions(
        Array.isArray(tagRes?.data)
          ? tagRes.data.map((tag: any) => ({
              id: String(tag.id),
              name: tag.name,
            }))
          : []
      );
      setAuthors(
        Array.isArray(authorRes?.data)
          ? authorRes.data.map((a: any) => ({
              id: String(a.id),
              // `options.get.ts` builds the label from the user's first and last
              // name, both of which are nullable, so it can legitimately be "".
              name: a.name?.trim() || a.id,
            }))
          : []
      );

      if (postId) {
        const data = postRes?.data;
        if (!data) {
          setError(postRes?.error || t("failed_to_load_post"));
          setIsLoading(false);
          return;
        }
        setPost(data);
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || "",
          content: data.content || "",
          categoryId: data.categoryId ? String(data.categoryId) : "",
          authorId: data.authorId ? String(data.authorId) : "",
          status: data.status || "DRAFT",
          image: data.image || "",
          tagNames: Array.isArray(data.tags)
            ? data.tags.map((tag: any) => tag.name)
            : [],
        });
        setFeaturedImage(data.image || null);
        slugTouched.current = true;
      }

      setIsDirty(false);
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
    // `api` is a stable literal keyed by scope.
  }, [api, postId]);

  // Browser-level guard. The in-app "unsaved" chip covers the rest.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // ----------------------------------------------------------------- fields
  const handleTitleChange = (value: string) => {
    const changes: Partial<PostFormState> = { title: value };
    if (!isEditing && !slugTouched.current) changes.slug = slugify(value);
    patch(changes);
    if (value.trim()) setFieldErrors((prev) => ({ ...prev, title: "" }));
  };

  const handleSlugChange = (value: string) => {
    slugTouched.current = true;
    patch({ slug: value });
  };

  const handleImageChange = (fileOrNull: File | null) => {
    setFeaturedImage(fileOrNull);
    setUploadError(null);
    setIsDirty(true);
    if (fileOrNull === null) setForm((prev) => ({ ...prev, image: "" }));
  };

  const addSuggestedTag = (name: string) => {
    if (form.tagNames.includes(name) || form.tagNames.length >= maxTags) return;
    patch({ tagNames: [...form.tagNames, name] });
  };

  const suggestedTags = useMemo(() => {
    const chosen = form.tagNames.map((name) => name.toLowerCase());
    return tagOptions
      .filter((tag) => !chosen.includes(tag.name.toLowerCase()))
      .slice(0, 12);
  }, [tagOptions, form.tagNames]);

  const stats = useMemo(() => readingStats(form.content), [form.content]);

  // ----------------------------------------------------------------- saving
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = t("required");
    if (!slugify(form.slug || form.title)) next.slug = t("required");
    if (!form.categoryId) next.categoryId = t("required");
    if (isAdmin && !form.authorId) next.authorId = t("required");
    // The body is marked required on both routes, but their AJV `required` is
    // satisfied by the key merely being PRESENT — `content: ""` sails through
    // and stores an empty article. A post whose only content is an image the
    // editor inserted still counts as written.
    if (!stats.words && !/<img\b/i.test(form.content)) {
      next.content = t("required");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    /* SHADOWED BRANCH. `if (isLoading) return <Skeleton/>` used to make this
       unreachable during the load; now it is reachable, and on an EDIT mount
       `form` is still `EMPTY_FORM` until the response lands. Submitting there
       would PUT a blank title, slug and body over a real published article.
       `validate()` happens to reject an empty title so the write is not
       actually reachable today, but that is a coincidence of one required
       field, not a guard — this is the guard. The button is disabled too; this
       covers Enter-to-submit from an input. */
    if (isLoading) return;
    setError(null);
    setUploadError(null);

    if (!validate()) {
      setError(tBlog("some_required_fields_are_missing"));
      return;
    }

    setIsSaving(true);

    let imageUrl = form.image;
    if (featuredImage instanceof File) {
      setIsUploading(true);
      const uploadResult = await imageUploader({
        file: featuredImage,
        dir: "blog-posts",
        size: { maxWidth: 1200, maxHeight: 800 },
        oldPath: isEditing ? form.image : "",
      });
      setIsUploading(false);

      if (!uploadResult.success) {
        setUploadError(uploadResult.error || "Failed to upload image");
        setIsSaving(false);
        return;
      }
      imageUrl = uploadResult.url;
    }

    // Known tags travel as ids so a rename in the tag manager cannot silently
    // fork them; anything the author typed goes as a name for the backend to
    // find-or-create.
    const tags = form.tagNames.map((name) => {
      const known = tagOptions.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      );
      return known ? { id: known.id } : { name };
    });

    const payload: Record<string, any> = {
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      description: form.description,
      content: form.content,
      categoryId: form.categoryId,
      status: form.status,
      image: imageUrl,
      tags,
    };
    if (isAdmin) payload.authorId = form.authorId;

    const { error: saveError } = await $fetch({
      url: isEditing ? api.update(postId!) : api.create,
      method: isEditing ? "PUT" : "POST",
      body: payload,
    });

    if (saveError) {
      setError(saveError);
      setIsSaving(false);
      return;
    }

    // Cleared before navigating so the beforeunload guard does not fire on our
    // own redirect.
    setIsDirty(false);
    router.push(api.back);
  };

  // ------------------------------------------------------------------ copy
  const heading = isEditing
    ? isAdmin
      ? tAdmin("edit_blog_post")
      : tBlog("edit_post")
    : isAdmin
      ? tAdmin("create_new_blog_post")
      : tBlog("create_new_post");

  const subheading = isEditing
    ? isAdmin
      ? tAdmin("update_blog_post_content_settings_and")
      : tBlog("update_your_existing_post")
    : isAdmin
      ? tAdmin("write_and_publish_a_new_blog")
      : tBlog("share_your_knowledge_our_community");

  /**
   * NO `if (isLoading) return <PostEditorSkeleton/>`.
   * ------------------------------------------------------------------------
   * `post-editor-skeleton.tsx` is an `h-12` bar and seven grey rectangles —
   * `h-72`, `h-[32rem]`, `h-64`, `h-72`, `h-56` — in the same 2/1 grid. The
   * real screen is three cards of labelled inputs and a sidebar of three more,
   * and every label, every card title, every helper sentence, the status
   * select's two options, the tag limit and the whole top bar are LITERALS in
   * this file. None of them needs the request. Swapping them for an
   * approximation of themselves that lives in another file — one that cannot
   * follow this one when a field is added — was the entire loading state.
   *
   * The skeleton file stays: four `loading.tsx` route files still use it for
   * the server-render window, before this component is mounted at all.
   *
   * The inputs render in both states, EMPTY AND DISABLED, and are deliberately
   * not wrapped in skeletons: an input's box is the same height whatever is in
   * it, so an empty field costs no movement, while a pulsing bar inside a text
   * field reads as a broken control rather than a pending one.
   */
  const fieldsDisabled = isLoading;
  /**
   * Only once the request has settled — during load the list is legitimately
   * empty and the field must not flash an explanation for a state that is
   * about to resolve.
   */
  const hasNoCategories = !isLoading && categories.length === 0;
  /**
   * Never lock a post out of its own field.
   *
   * Disabling on an empty list is right when there is nothing to pick, but on
   * an EXISTING post whose category list failed to load it would strand the
   * operator: the trigger shows the placeholder (Radix has no item matching
   * the stored id), and a disabled control gives them no way to restore it.
   * With a value present the select stays open so a retry can fix it.
   */
  const categorySelectDisabled = fieldsDisabled || (hasNoCategories && !form.categoryId);

  /**
   * Leaving by the back link is the one exit that silently loses work — the
   * `beforeunload` guard above only covers a real browser navigation, and a
   * client-side route change is not one. No other full-screen surface in this
   * app guards it; all of them just drop the edit.
   */
  const confirmExit = (event: React.MouseEvent) => {
    if (!isDirty) return;
    if (!window.confirm(t("you_have_unsaved_changes_leave"))) {
      event.preventDefault();
    }
  };

  const primaryLabel = isEditing ? t("save_changes") : t("create");

  return (
    <EditorShell
      bar={
        <>
          {/* A real <Link>, not `router.push`: middle-click and "open in new
              tab" should work on the way out of an editor. */}
          <Button asChild variant="ghost" size="icon-sm" aria-label={t("back")}>
            <Link href={api.back} onClick={confirmExit}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <EditorBarDivider />
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-sm font-semibold">{heading}</h1>
            <p className="hidden truncate text-xs text-muted-foreground lg:block">
              {subheading}
            </p>
          </div>
        </>
      }
      actions={
        <>
          {isDirty && (
            <Badge tone="warning" appearance="soft" className="hidden gap-1.5 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t("unsaved_changes")}
            </Badge>
          )}
          {/* SHADOWED BRANCH. `form.status` defaults to `"DRAFT"`, so on an
              edit mount this pill said DRAFT — in the top bar, in the draft
              tone — about a post that is about to resolve to Published. A
              status chip is a claim; an unknown status must not be painted as a
              known one. `status={undefined}` takes `statusTone` to neutral and
              the label override reserves the word. */}
          <StatusBadge
            status={isLoading ? undefined : form.status}
            label={isLoading ? <SkeletonText placeholder="Published" /> : undefined}
            icon={<FileText className="h-3.5 w-3.5" />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fieldsDisabled}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">{t("preview")}</span>
          </Button>
          {/* Outside the <form>, so it needs `form=` to submit it. Every
              viewport-owning surface in this app puts the primary action at the
              far right of its bar; only the document-scroll ones float it at
              the bottom. */}
          {/* `<Button loading>` rather than a hand-rolled `<Loader2>` swap: it
              draws its own `size-4` spinner into the leading slot and sets
              `aria-busy`, so the save is announced and not merely animated.
              `disabled` also carries `fieldsDisabled` — see `handleSubmit` for
              why saving before the post has loaded is a data-loss bug and not
              just a no-op. */}
          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            loading={isSaving || isUploading}
            disabled={fieldsDisabled}
          >
            {/* INTENTIONAL — the same exemption `connectivity-tester.tsx` and
                `staking/position/components/details.tsx` carry: `Button` puts
                its spinner in this leading slot, so the Save icon steps aside
                to keep exactly one 16px glyph there rather than two. */}
            {!(isSaving || isUploading) && <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isSaving || isUploading ? `${t("saving")}...` : primaryLabel}
            </span>
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6"
      >
        <div ref={errorRef}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ------------------------------------------------ main column */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <Type className="h-3.5 w-3.5" />
                  </span>
                  {tAdmin("post_information")}
                </CardTitle>
                <CardDescription>
                  {tBlog("the_headline_address_and_summary_readers_see_first")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="post-title">
                    {t("title")}{" "}
                    <span className="text-destructive-ink">*</span>
                  </Label>
                  <Input
                    id="post-title"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={`${tBlog("enter_a_compelling_title")}…`}
                    maxLength={255}
                    aria-invalid={Boolean(fieldErrors.title)}
                    disabled={fieldsDisabled}
                    className="h-12 text-lg font-medium"
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-destructive-ink">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-slug" className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-subtle-foreground" />
                    {t("slug")} <span className="text-destructive-ink">*</span>
                  </Label>
                  <Input
                    id="post-slug"
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    // Normalise on blur, but only when it actually changes
                    // something — an unconditional patch here marks a post
                    // "unsaved" for nothing more than tabbing through the field.
                    onBlur={() => {
                      const normalised = slugify(form.slug);
                      if (normalised !== form.slug) patch({ slug: normalised });
                    }}
                    placeholder="my-first-post"
                    maxLength={255}
                    aria-invalid={Boolean(fieldErrors.slug)}
                    disabled={fieldsDisabled}
                    className="font-mono text-sm"
                  />
                  {/* `/blog/` is the constant half and renders throughout;
                      only the slug itself is pending. The ellipsis stays as the
                      RESOLVED empty-slug placeholder it always was — it means
                      "you have not named this post", which is a different
                      statement from "we have not read it yet". */}
                  <p className="text-xs text-subtle-foreground">
                    /blog/
                    <Loadable loading={isLoading} chars={18}>
                      {slugify(form.slug || form.title) || "…"}
                    </Loadable>
                  </p>
                  {fieldErrors.slug && (
                    <p className="text-xs text-destructive-ink">
                      {fieldErrors.slug}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-description">
                    {t("description")}{" "}
                    <span className="text-subtle-foreground">
                      ({t("optional")})
                    </span>
                  </Label>
                  <Textarea
                    id="post-description"
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder={`${tBlog(
                      "write_a_brief_description_of_your_post"
                    )}…`}
                    rows={3}
                    disabled={fieldsDisabled}
                  />
                  {/* SHADOWED BRANCH. `form` starts at `EMPTY_FORM`, so on an
                      edit mount this read "0 characters" about a summary that
                      is about to resolve to 140. Only the FIGURE waits; the
                      word beside it is a constant. */}
                  <p className="text-xs text-subtle-foreground">
                    <Loadable loading={isLoading} chars={3}>
                      {form.description.length}
                    </Loadable>{" "}
                    {t("characters")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  {t("content")} <span className="text-destructive-ink">*</span>
                </CardTitle>
                <CardDescription>
                  {tAdmin("full_content_body_of_the_blog")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <WysiwygEditor
                  value={form.content}
                  onChange={(content) => {
                    patch({ content });
                    if (content) setFieldErrors((prev) => ({ ...prev, content: "" }));
                  }}
                  placeholder={`${tBlog("write_your_post_content_here")}…`}
                  uploadDir="blog-posts"
                  minHeight={480}
                  showWordCount
                  // Admins curate the whole library; an author only ever sees
                  // their own uploads in the media manager.
                  userOnly={!isAdmin}
                />
                {fieldErrors.content && (
                  <p className="text-xs text-destructive-ink">
                    {fieldErrors.content}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---------------------------------------------------- sidebar */}
          <div className="space-y-6">
            {/* Deliberately NOT sticky. Sticky here resolves against the
                shell's scroll container and does work — which is the problem:
                the sidebar's three cards are taller than the viewport, so
                pinning the first one just parks it over the two below and
                clips them as they scroll past. Save lives in the fixed top bar,
                which is the reason anyone wanted a pinned sidebar to begin
                with. */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <CalendarClock className="h-3.5 w-3.5" />
                  </span>
                  {t("publishing")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="post-status">{t("status")}</Label>
                  {/* `""` while pending rather than the `"DRAFT"` default:
                      a select asserting the wrong publish state on an edit
                      mount is worse than one asserting none, and no `<option>`
                      carries `""` so the trigger falls back to its placeholder.
                      The 36px trigger is unchanged either way. */}
                  <Select
                    value={isLoading ? "" : form.status}
                    onValueChange={(status) => patch({ status })}
                    disabled={fieldsDisabled}
                  >
                    <SelectTrigger id="post-status" className="w-full">
                      <SelectValue placeholder={t("select_status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                      <SelectItem value="PUBLISHED">
                        {t("published")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-subtle-foreground">
                    {tBlog("set_as_draft_it_live")}.
                  </p>
                </div>

                {isAdmin && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="post-author"
                      className="flex items-center gap-2"
                    >
                      <User className="h-3.5 w-3.5 text-subtle-foreground" />
                      {t("author")}{" "}
                      <span className="text-destructive-ink">*</span>
                    </Label>
                    <Select
                      value={form.authorId}
                      onValueChange={(authorId) => {
                        patch({ authorId });
                        setFieldErrors((prev) => ({ ...prev, authorId: "" }));
                      }}
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger
                        id="post-author"
                        className="w-full"
                        aria-invalid={Boolean(fieldErrors.authorId)}
                      >
                        <SelectValue placeholder={t("select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {authors.map((author) => (
                          <SelectItem key={author.id} value={author.id}>
                            {author.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.authorId && (
                      <p className="text-xs text-destructive-ink">
                        {fieldErrors.authorId}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <dl className="space-y-2 text-xs">
                  {/* SHADOWED BRANCH. `readingStats("")` returns
                      `{words: 0, minutes: 1}`, so on an edit mount the sidebar
                      confidently reported a 1,400-word article as "0 words,
                      1 min". Both labels are constants and render throughout;
                      only the two figures wait. */}
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-subtle-foreground">{tBlog("words")}</dt>
                    <dd className="font-mono tabular-nums">
                      <Loadable loading={isLoading} chars={4}>
                        {stats.words}
                      </Loadable>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-subtle-foreground">
                      {tBlog("read_time")}
                    </dt>
                    <dd className="font-mono tabular-nums">
                      <Loadable loading={isLoading} chars={2}>
                        {stats.minutes}
                      </Loadable>{" "}
                      {t("min")}
                    </dd>
                  </div>
                  {/*
                    Gated on `isEditing`, not on the data.
                    ----------------------------------------------------------
                    `post?.createdAt &&` withheld both rows for the length of
                    the fetch and then grew this `<dl>` by two 16px lines plus
                    its `space-y-2` — about 40px — pushing the two cards below
                    it down the sidebar the moment the post arrived.

                    Whether these rows BELONG is knowable at mount: a create
                    mount has no timestamps and never will, an edit mount has
                    them and is only waiting to be told what they are. `postId`
                    is a prop. So the rows are reserved on `isEditing` and only
                    the dates are pending values.

                    `post?.createdAt` survives inside the guard for the one real
                    case it covers: an edit mount whose GET failed, where
                    `error` is set and there is no record to date.
                  */}
                  {(isEditing || post?.createdAt) && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-subtle-foreground">
                        {t("created_at")}
                      </dt>
                      <dd>
                        <Loadable loading={isLoading} placeholder={t("jan_1") + " 2026"}>
                          {post?.createdAt
                            ? format(new Date(post.createdAt), "PP")
                            : null}
                        </Loadable>
                      </dd>
                    </div>
                  )}
                  {(isEditing || post?.updatedAt) && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-subtle-foreground">
                        {t("updated_at")}
                      </dt>
                      <dd>
                        <Loadable loading={isLoading} placeholder={t("jan_1") + " 2026"}>
                          {post?.updatedAt
                            ? format(new Date(post.updatedAt), "PP")
                            : null}
                        </Loadable>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <TagIcon className="h-3.5 w-3.5" />
                  </span>
                  {tAdmin("categorization")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="post-category">
                    {t("category")}{" "}
                    <span className="text-destructive-ink">*</span>
                  </Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(categoryId) => {
                      patch({ categoryId });
                      setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
                    }}
                    disabled={categorySelectDisabled}
                  >
                    <SelectTrigger
                      id="post-category"
                      className="w-full"
                      aria-invalid={Boolean(fieldErrors.categoryId)}
                    >
                      <SelectValue placeholder={t("select_a_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/*
                    The explanation lives HERE, not inside the popper.
                    `SelectContent` clamps its viewport to the trigger's height
                    when positioned as a popper, so a message rendered among
                    the items is scrolled rather than shown — and a trigger
                    that opens onto nothing reads as a broken control either
                    way. Disabling it above and explaining underneath removes
                    the blank-popper state instead of decorating it.
                  */}
                  {fieldErrors.categoryId ? (
                    <p className="text-xs text-destructive-ink">
                      {fieldErrors.categoryId}
                    </p>
                  ) : categoriesError ? (
                    <p className="text-xs text-destructive-ink">
                      {tBlog("categories_could_not_be_loaded")}
                    </p>
                  ) : hasNoCategories ? (
                    <p className="text-xs text-warning-ink">
                      {tBlog("no_categories_have_been_created_yet")}
                    </p>
                  ) : (
                    <p className="text-xs text-subtle-foreground">
                      {tBlog("select_the_category_that_best_fits_your_post")}.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-tags">{t("tags")}</Label>
                  <TagInput
                    value={form.tagNames}
                    onChange={(tagNames) => patch({ tagNames })}
                    placeholder={`${tBlog("add_tags_separate_with_comma")}…`}
                    maxTags={maxTags}
                    disabled={fieldsDisabled}
                  />
                  <p className="text-xs text-subtle-foreground">
                    {tBlog("you_can_add_up_to")} {maxTags}{" "}
                    {tBlog("tags_to_your_post")}.{" "}
                    {tBlog("type_and_press_comma_or_enter_to_add_a_tag")}.
                  </p>
                  {suggestedTags.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs text-subtle-foreground">
                        {tBlog("suggested_tags")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => addSuggestedTag(tag.name)}
                            disabled={form.tagNames.length >= maxTags}
                            className={cn(
                              "rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground",
                              "transition-[color,background-color,border-color] duration-200",
                              "hover:border-border-strong hover:text-foreground",
                              "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
                              "disabled:pointer-events-none disabled:opacity-50"
                            )}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </span>
                  {t("featured_image")}
                </CardTitle>
                <CardDescription>
                  {tBlog("this_image_will_media_previews")}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* No `title`: the CardTitle directly above already says
                    "Featured image", and a second copy inside the control is
                    the same name twice. `aspectRatio` genuinely works now — it
                    replaces the height rather than being overridden by it — so
                    this renders at 16:9 in the sidebar column instead of the
                    default 320px box. */}
                <ImageUpload
                  value={featuredImage}
                  onChange={handleImageChange}
                  error={Boolean(uploadError)}
                  errorMessage={uploadError || ""}
                  loading={isUploading || isLoading}
                  aspectRatio="video"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent size="4xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("preview")}</DialogTitle>
            <DialogDescription>
              {tBlog("how_this_post_will_read_once_published")}
            </DialogDescription>
          </DialogHeader>
          {/* Rendered with the same `prose` binding and the same sanitizer the
              public post page uses, inside the app's own theme — the old
              preview wrote into `window.open("", "_blank")`, a document with no
              stylesheet, so it could only ever approximate the real article. */}
          <article className="space-y-4">
            {form.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image}
                alt=""
                className="max-h-80 w-full rounded-lg object-cover"
              />
            )}
            <h1 className="text-3xl font-bold tracking-tight">
              {form.title || tBlog("untitled_post")}
            </h1>
            {form.description && (
              <p className="text-lg text-muted-foreground">
                {form.description}
              </p>
            )}
            {form.tagNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tagNames.map((name) => (
                  <Badge key={name} appearance="soft" tone="neutral">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
            <Separator />
            {form.content ? (
              <SafeHtml
                className="prose prose-sm sm:prose-base max-w-none prose-img:rounded-lg prose-a:font-medium prose-a:underline prose-a:underline-offset-4"
                html={form.content}
              />
            ) : (
              <p className="text-sm text-subtle-foreground">
                {tBlog("nothing_written_yet")}
              </p>
            )}
          </article>
        </DialogContent>
      </Dialog>
    </EditorShell>
  );
}

export default PostEditor;
