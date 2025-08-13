"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Atendimento } from "@/lib/api-client"

interface AtendimentoFormProps {
  atendimento?: Atendimento
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Atendimento, "id"> | Partial<Atendimento>) => void
  loading?: boolean
}

export function AtendimentoForm({ atendimento, open, onOpenChange, onSubmit, loading }: AtendimentoFormProps) {
  const [formData, setFormData] = useState({
    cliente: "",
    tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
    status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
    data: new Date().toLocaleDateString("pt-BR"),
    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    descricao: "",
  })

  useEffect(() => {
    if (atendimento) {
      setFormData({
        cliente: atendimento.cliente || "",
        tipo: (atendimento.tipo || "Suporte") as "Suporte" | "Vendas" | "Consultoria",
        status: (atendimento.status || "Pendente") as "Em Andamento" | "Concluído" | "Pendente",
        data: atendimento.data || new Date().toLocaleDateString("pt-BR"),
        hora: atendimento.hora || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        descricao: atendimento.descricao || "",
      })
    } else {
      setFormData({
        cliente: "",
        tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
        status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        descricao: "",
      })
    }
  }, [atendimento])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{atendimento ? "Editar Atendimento" : "Novo Atendimento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Suporte">Suporte</SelectItem>
                <SelectItem value="Vendas">Vendas</SelectItem>
                <SelectItem value="Consultoria">Consultoria</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
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