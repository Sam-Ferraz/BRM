"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { api, type Client } from "@/lib/api-client"
import { ClientForm } from "@/components/forms/client-form"

interface ClientSearchProps {
  value?: string
  onSelect: (clientName: string) => void
  onClientSelect?: (client: Client) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ClientSearch({
  value,
  onSelect,
  onClientSelect,
  placeholder,
  disabled,
  className,
}: ClientSearchProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientFormLoading, setClientFormLoading] = useState(false)
  const commandListRef = useRef<HTMLDivElement>(null)

  const loadClients = useCallback(async (search?: string) => {
    try {
      setLoading(true)
      const response = await api.clients.getAll(search ? { search } : {})
      setClients(response.data)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadClients()
    }
  }, [open, loadClients])

  // Enable mouse wheel scrolling by adding wheel event handling
  useEffect(() => {
    if (!open) return

    const timeoutId = setTimeout(() => {
      const commandList = commandListRef.current
      if (commandList) {
        // Force enable scroll behavior
        commandList.style.overflowY = 'auto'
        commandList.style.overscrollBehavior = 'contain'
        
        const handleWheel = (e: WheelEvent) => {
          if (commandList.contains(e.target as Node)) {
            // Allow native scrolling by not preventing default
            e.stopPropagation()
          }
        }
        
        commandList.addEventListener('wheel', handleWheel, { passive: true })
        return () => commandList.removeEventListener('wheel', handleWheel)
      }
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [open])

  const handleSearch = useCallback(
    (search: string) => {
      setSearchValue(search)
      if (search.trim()) {
        loadClients(search)
      } else {
        loadClients()
      }
    },
    [loadClients]
  )

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      setOpen(false)
      setShowClientForm(true)
    }
  }

  const handleClientFormSubmit = useCallback(async (clientData: Omit<Client, "id">) => {
    try {
      setClientFormLoading(true)
      const newClient = await api.clients.create(clientData)
      
      // Update the selected client immediately
      onSelect(newClient.name)
      onClientSelect?.(newClient)
      
      // Close the client form and clear search
      setShowClientForm(false)
      setSearchValue("")
      
      // Refresh the clients list for next time
      loadClients()
    } catch (error) {
      console.error('Error creating client:', error)
    } finally {
      setClientFormLoading(false)
    }
  }, [onSelect, loadClients])

  const handleClientFormClose = (open: boolean) => {
    setShowClientForm(open)
    if (!open) {
      setSearchValue("")
    }
  }

  const handleSelectClient = (client: Client) => {
    onSelect(client.name)
    onClientSelect?.(client)
    setOpen(false)
    setSearchValue("")
  }

  const displayValue = value || ""
  const showCreateNew = searchValue.trim() && 
    !clients.some(client => client.name.toLowerCase() === searchValue.toLowerCase())

  return (
    <div>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {displayValue || placeholder || t('selectClient')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchClients')}
            value={searchValue}
            onValueChange={handleSearch}
          />
          <CommandList ref={commandListRef} className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ overscrollBehavior: 'contain' }}>
            {loading && (
              <CommandEmpty>{t('loading')}</CommandEmpty>
            )}
            {!loading && showCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('createNewClient')}: "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}
            {!loading && clients.length > 0 && (
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => handleSelectClient(client)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{client.name}</div>
                      {client.company && (
                        <div className="text-sm text-muted-foreground">
                          {client.company}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!loading && !showCreateNew && clients.length === 0 && (
              <CommandEmpty>{t('noClientsFound')}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <ClientForm
      initialName={searchValue.trim()}
      open={showClientForm}
      onOpenChange={handleClientFormClose}
      onSubmit={handleClientFormSubmit}
      loading={clientFormLoading}
    />
    </div>
  )
}
