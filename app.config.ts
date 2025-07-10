export default defineAppConfig({
  ui: {
    accordion: {
      slots: {
        root: 'w-full',
        item: 'border-b border-gray-200 dark:border-gray-800 last:border-b-0',
        header: 'flex',
        trigger: 'group flex-1 flex items-center gap-1.5 font-medium text-sm py-3.5 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-primary min-w-0 cursor-pointer transition-colors duration-150 rounded-lg',
        content: 'data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out] overflow-hidden focus:outline-none',
        body: 'text-sm pb-3.5 px-4',
        leadingIcon: 'shrink-0 size-5',
        trailingIcon: 'shrink-0 size-5 ms-auto group-data-[state=open]:rotate-180 transition-transform duration-200',
        label: 'text-start break-words'
      },
      variants: {
        disabled: {
          true: {
            trigger: 'cursor-not-allowed opacity-75'
          }
        }
      }
    }
  }
}) 