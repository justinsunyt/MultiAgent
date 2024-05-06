type UpdateSidebarFunction = (open: boolean) => void;

export type SidebarContextType = {
  open: boolean;
  setOpen: UpdateSidebarFunction;
};
