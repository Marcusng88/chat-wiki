'use client'
import { createLibrary, type DefinedComponent, type Library } from '@openuidev/react-lang'
import { openuiChatLibrary, openuiChatComponentGroups } from '@openuidev/react-ui/genui-lib'
import Markdown from '@/components/Markdown'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = DefinedComponent<any>

const allComps = Object.values(
  (openuiChatLibrary as unknown as { components: Record<string, AnyComp> }).components
)

// Swap built-in text renderers with our Markdown component, which has:
// - rehype-katex for math rendering
// - custom cite handler matching [[N]](#sN) syntax
const customComponents = allComps.map((c): AnyComp => {
  if (c.name === 'TextContent') {
    return {
      ...c,
      component: ({ props }: { props: { text: string } }) => <Markdown md={props.text} />,
    } as AnyComp
  }
  if (c.name === 'MarkDownRenderer') {
    return {
      ...c,
      component: ({ props }: { props: { textMarkdown: string } }) => <Markdown md={props.textMarkdown} />,
    } as AnyComp
  }
  return c
})

export const customChatLibrary: Library = createLibrary({
  root: 'Card',
  componentGroups: openuiChatComponentGroups,
  components: customComponents,
})
