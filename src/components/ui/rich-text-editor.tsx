import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { Extension } from '@tiptap/core';
import { 
  Italic, 
  Underline as UnderlineIcon, 
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Link as LinkIcon,
  Palette,
  ChevronDown
} from 'lucide-react';
import { Button } from './button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Input } from './input';
import { Label } from './label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from './utils';

// Declare custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (weight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
  }
}

// Custom FontWeight extension
const FontWeight = Extension.create({
  name: 'fontWeight',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: element => element.style.fontWeight || null,
            renderHTML: attributes => {
              if (!attributes.fontWeight) {
                return {};
              }
              return {
                style: `font-weight: ${attributes.fontWeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (weight: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontWeight: weight }).run();
        },
      unsetFontWeight:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontWeight: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [colorValue, setColorValue] = React.useState('#000000');
  const [fontWeight, setFontWeight] = React.useState('400');
  const [, setSelectionUpdate] = React.useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false, // Disable default bold
      }),
      Underline,
      TextStyle,
      Color,
      FontWeight,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Force re-render when selection changes to update button states
      setSelectionUpdate(prev => prev + 1);
      // Update font weight state
      const currentWeight = editor.getAttributes('textStyle').fontWeight;
      setFontWeight(currentWeight || '400');
    },
  });

  // Helper function to check if formatting should show as active
  // For marks (bold, italic, underline, link) - show active based on current marks
  // For blocks (headings) - only show active when text is selected
  const isMarkActive = (formatCheck: () => boolean): boolean => {
    if (!editor) return false;
    return formatCheck();
  };

  const isBlockActive = (formatCheck: () => boolean): boolean => {
    if (!editor) return false;
    const { from, to } = editor.state.selection;
    // Only show as active if there's an actual selection (not just cursor position)
    const hasSelection = from !== to;
    return hasSelection && formatCheck();
  };

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl })
      .run();
    
    setLinkUrl('');
  };

  const setTextColor = () => {
    editor.chain().focus().setColor(colorValue).run();
  };

  if (!editable) {
    return (
      <div className="max-w-none">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="border rounded-md w-full overflow-hidden">
      {/* Toolbar */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-0.5 md:gap-1 p-1.5 md:p-2 border-b bg-muted/50 overflow-x-auto">
          {/* Headings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isBlockActive(() => editor.isActive('heading', { level: 1 })) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <Heading1 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 1</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isBlockActive(() => editor.isActive('heading', { level: 2 })) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <Heading2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 2</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isBlockActive(() => editor.isActive('heading', { level: 3 })) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <Heading3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 3</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isBlockActive(() => editor.isActive('heading', { level: 4 })) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <Heading4 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 4</TooltipContent>
          </Tooltip>

          <div className="hidden md:block w-px h-6 bg-border mx-1" />

          {/* Font Weight Dropdown */}
          <Select
            value={fontWeight}
            onValueChange={(value) => {
              editor?.chain().focus().setFontWeight(value).run();
              setFontWeight(value);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-7 md:h-8 w-[85px] md:w-[110px] text-[10px] md:text-xs">
                  <SelectValue placeholder="Weight" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Font Weight</TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="300">Light</SelectItem>
              <SelectItem value="400">Regular</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Text formatting */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isMarkActive(() => editor.isActive('italic')) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <Italic className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn(
                  'h-7 w-7 md:h-8 md:w-8 p-0',
                  isMarkActive(() => editor.isActive('underline')) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <UnderlineIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline</TooltipContent>
          </Tooltip>

          <div className="hidden md:block w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0"
                  >
                    <Palette className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Text Color</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-56 md:w-64">
              <div className="space-y-2">
                <Label htmlFor="color" className="text-xs md:text-sm">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={colorValue}
                    onChange={(e) => setColorValue(e.target.value)}
                    className="h-8 md:h-10 w-16 md:w-20"
                  />
                  <Button onClick={setTextColor} size="sm" className="text-xs">
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Link */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 w-7 md:h-8 md:w-8 p-0',
                      isMarkActive(() => editor.isActive('link')) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    <LinkIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Add Link</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 md:w-80">
              <div className="space-y-2">
                <Label htmlFor="link" className="text-xs md:text-sm">Link URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="link"
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-xs md:text-sm"
                  />
                  <Button onClick={setLink} size="sm" className="text-xs">
                    Set
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>

      {/* Editor */}
      <div className="p-2 md:p-4 min-h-[150px] md:min-h-[200px] max-w-none">
        <EditorContent editor={editor} className="prose prose-sm md:prose max-w-none" />
      </div>
    </div>
  );
}

