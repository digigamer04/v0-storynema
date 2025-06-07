"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bug, X, Copy, Trash2, Download, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug" | "api"
  category: string
  message: string
  data?: any
  stack?: string
}

class DebugLogger {
  private static instance: DebugLogger
  private logs: LogEntry[] = []
  private listeners: ((logs: LogEntry[]) => void)[] = []
  private maxLogs = 1000

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger()
    }
    return DebugLogger.instance
  }

  log(level: LogEntry["level"], category: string, message: string, data?: any, stack?: string) {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      stack,
    }

    this.logs.unshift(entry)

    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Notificar a los listeners
    this.listeners.forEach((listener) => listener([...this.logs]))

    // También loggear en consola para desarrollo
    const consoleMethod = level === "error" ? "error" : level === "warn" ? "warn" : "log"
    console[consoleMethod](`[${category}] ${message}`, data || "")
  }

  info(category: string, message: string, data?: any) {
    this.log("info", category, message, data)
  }

  warn(category: string, message: string, data?: any) {
    this.log("warn", category, message, data)
  }

  error(category: string, message: string, data?: any, error?: Error) {
    this.log("error", category, message, data, error?.stack)
  }

  debug(category: string, message: string, data?: any) {
    this.log("debug", category, message, data)
  }

  api(category: string, message: string, data?: any) {
    this.log("api", category, message, data)
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener)
    listener([...this.logs])

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  clear() {
    this.logs = []
    this.listeners.forEach((listener) => listener([]))
  }

  exportLogs() {
    const logsText = this.logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
            log.data ? "\nData: " + JSON.stringify(log.data, null, 2) : ""
          }${log.stack ? "\nStack: " + log.stack : ""}`,
      )
      .join("\n\n")

    const blob = new Blob([logsText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `storynema-logs-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export const logger = DebugLogger.getInstance()

export function DebugLoggerComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = logger.subscribe(setLogs)
    return unsubscribe
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter
    const matchesSearch =
      search === "" ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.category.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const copyToClipboard = () => {
    const logsText = filteredLogs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
            log.data ? "\nData: " + JSON.stringify(log.data, null, 2) : ""
          }`,
      )
      .join("\n\n")

    navigator.clipboard.writeText(logsText)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-500"
      case "warn":
        return "bg-yellow-500"
      case "info":
        return "bg-blue-500"
      case "debug":
        return "bg-gray-500"
      case "api":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
          title="Abrir Debug Logger"
        >
          <Bug className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-2xl">
      <Card className="bg-transparent border-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Logger
              <Badge variant="secondary" className="text-xs">
                {logs.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 text-gray-400 hover:text-white"
              >
                {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex items-center gap-2 mt-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 text-xs bg-[#2A2A2A] border-[#444444]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444444]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="error">Errores</SelectItem>
                  <SelectItem value="warn">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs bg-[#2A2A2A] border-[#444444]"
              />
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-7 text-xs text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logger.exportLogs()}
                className="h-7 text-xs text-gray-400 hover:text-white"
              >
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logger.clear()}
                className="h-7 text-xs text-gray-400 hover:text-white"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>

            <ScrollArea className="h-[400px]" ref={scrollRef}>
              <div className="space-y-1">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded text-xs bg-[#2A2A2A] border border-[#444444]">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getLevelColor(log.level)} text-white text-xs px-1 py-0`}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-gray-400">{formatTime(log.timestamp)}</span>
                      <span className="text-purple-400">[{log.category}]</span>
                    </div>
                    <div className="text-gray-200 mb-1">{log.message}</div>
                    {log.data && (
                      <details className="text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-200">Data</summary>
                        <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(log.data, null, 2)}</pre>
                      </details>
                    )}
                    {log.stack && (
                      <details className="text-red-400">
                        <summary className="cursor-pointer hover:text-red-300">Stack Trace</summary>
                        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">{log.stack}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
