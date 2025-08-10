"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { PautaVenda } from "@/lib/api-client"

interface PautaVendaFormProps {
  pautaVenda?: PautaVenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<PautaVenda, "id"> | Partial<PautaVenda>) => void
  loading?: boolean
}

export function PautaVendaForm({ pautaVenda, open, onOpenChange, onSubmit, loading }: PautaVendaFormProps) {
  const [formData, setFormData] = useState({
    titulo: "",
    cliente: "",
    valor: "",
    data: new Date().toLocaleDateString("pt-BR"),
    status: "Ativa" as const,
  })

  useEffect(() => {
    if (pautaVenda) {
      setFormData({
        titulo: pautaVenda.titulo || "",
        cliente: pautaVenda.cliente || "",
        valor: pautaVenda.valor || "",
        data: pautaVenda.data || new Date().toLocaleDateString("pt-BR"),
        status: pautaVenda.status || "Ativa",
      })
    } else {
      setFormData({
        titulo: "",
        cliente: "",
        valor: "",
        data: new Date().toLocaleDateString("pt-BR"),
        status: "Ativa" as const,
      })
    }
  }, [pautaVenda])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{pautaVenda ? "Editar Pauta" : "Nova Pauta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder="R$ 0,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}