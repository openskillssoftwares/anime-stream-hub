import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3, Copy, Loader2, PlayCircle, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const roomSeedAvatar = (seed: string) => `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}`;

type RoomSyncMessage = {
  type: "start_watch";
  mal_id: number;
  episode: number;
  sender?: string;
};

const Rooms = () => {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState(code?.toUpperCase() || searchParams.get("code")?.toUpperCase() || "");
  const [title, setTitle] = useState(searchParams.get("title") || "Watch party");
  const [episode, setEpisode] = useState(searchParams.get("episode") || "1");
  const [malId, setMalId] = useState(searchParams.get("mal_id") || "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sendingStart, setSendingStart] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (code) {
      setRoomCode(code.toUpperCase());
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const wsUrl = ((import.meta.env.VITE_BACKEND_URL as string) || window.location.origin)
      .replace("http", "ws") + `/ws/rooms/${code.toUpperCase()}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as RoomSyncMessage;
        if (msg.type !== "start_watch") return;
        if (!msg.mal_id || !msg.episode) return;
        navigate(`/watch/${msg.mal_id}?ep=${msg.episode}&room=${code.toUpperCase()}&autoplay=1`);
      } catch {
        // Ignore malformed socket messages.
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [code, navigate]);

  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.rooms(18),
    refetchInterval: 10000,
  });

  const room = useQuery({
    queryKey: ["room", code],
    queryFn: () => api.getRoom(code!),
    enabled: !!code,
    retry: 0,
  });

  const parsedEpisode = useMemo(() => {
    const value = Number.parseInt(episode, 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }, [episode]);

  const parsedMalId = useMemo(() => {
    const value = Number.parseInt(malId, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [malId]);

  const createRoom = async () => {
    if (!user) {
      toast.error("Sign in to create a room");
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Room title is required");
      return;
    }
    setCreating(true);
    try {
      const created = await api.createRoom({ title: cleanTitle, mal_id: parsedMalId, episode: parsedEpisode });
      toast.success(`Room ${created.code} created`);
      navigate(`/rooms/${created.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const nextCode = roomCode.trim().toUpperCase();
    if (!nextCode) return;
    setJoining(true);
    try {
      if (user) {
        await api.joinRoom(nextCode);
      }
      navigate(`/rooms/${nextCode}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  const copyRoomLink = async (value: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rooms/${value}`);
      toast.success("Room link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const joinButtonLabel = joining ? "Joining..." : "Join room";

  const startWatchForEveryone = () => {
    if (!code || !room.data) return;
    const selectedMal = parsedMalId ?? room.data.mal_id ?? null;
    const selectedEpisode = parsedEpisode;
    if (!selectedMal) {
      toast.error("Set a valid MAL ID first");
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Room sync channel is not ready");
      return;
    }

    setSendingStart(true);
    const payload: RoomSyncMessage = {
      type: "start_watch",
      mal_id: selectedMal,
      episode: selectedEpisode,
      sender: user?.id,
    };
    wsRef.current.send(JSON.stringify(payload));
    navigate(`/watch/${selectedMal}?ep=${selectedEpisode}&room=${code.toUpperCase()}&autoplay=1`);
    window.setTimeout(() => setSendingStart(false), 250);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-24 space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-3xl bg-card/60 ring-1 ring-border/60 p-6 md:p-8 shadow-2xl shadow-black/10">
            <p className="text-xs uppercase tracking-[0.35em] text-primary mb-3">Watch together</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">Open a room and watch in sync.</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              Create a room for a specific anime and episode, then share the code with friends. It is a lightweight room layer on top of the existing watch page, so it stays fast even when you only need a simple shared session.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="secondary" className="gap-1.5"><Users className="w-3.5 h-3.5" /> shared room codes</Badge>
              <Badge variant="secondary" className="gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> anime + episode</Badge>
              <Badge variant="secondary" className="gap-1.5"><Clock3 className="w-3.5 h-3.5" /> live-ish room updates</Badge>
            </div>
          </div>

          <div className="rounded-3xl bg-card/60 ring-1 ring-border/60 p-6 md:p-8 space-y-5">
            <div>
              <Label htmlFor="room-title">Room title</Label>
              <Input id="room-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 bg-secondary/50 border-border/60" placeholder="Friday night watch party" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="room-mal">MAL ID</Label>
                <Input id="room-mal" value={malId} onChange={(e) => setMalId(e.target.value)} className="mt-2 bg-secondary/50 border-border/60" placeholder="52991" />
              </div>
              <div>
                <Label htmlFor="room-episode">Episode</Label>
                <Input id="room-episode" value={episode} onChange={(e) => setEpisode(e.target.value)} className="mt-2 bg-secondary/50 border-border/60" placeholder="1" />
              </div>
            </div>
            <Button onClick={createRoom} disabled={creating} className="w-full bg-gradient-ember text-primary-foreground">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create room
            </Button>
            <div className="pt-2 border-t border-border/40 space-y-3">
              <Label htmlFor="room-code">Join a room</Label>
              <div className="flex gap-2">
                <Input
                  id="room-code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-secondary/50 border-border/60 uppercase"
                  placeholder="A1B2C3D4"
                />
                <Button variant="outline" onClick={joinRoom} disabled={joining}>{joinButtonLabel}</Button>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-card/50 ring-1 ring-border/60 p-6">
            <h2 className="font-display text-2xl font-semibold mb-4">Recent rooms</h2>
            {rooms.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading rooms...</div>
            ) : rooms.data?.length ? (
              <div className="space-y-3">
                {rooms.data.map((roomRow) => (
                  <button
                    key={roomRow.id}
                    onClick={() => navigate(`/rooms/${roomRow.code}`)}
                    className="w-full text-left rounded-2xl bg-secondary/35 hover:bg-secondary/55 ring-1 ring-border/50 hover:ring-primary/40 transition-all p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 ring-1 ring-border/60">
                        <AvatarImage src={roomRow.host_avatar_url || roomSeedAvatar(roomRow.host_id)} alt={roomRow.host_name} />
                        <AvatarFallback>{roomRow.host_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium truncate">{roomRow.title}</p>
                          <Badge variant="outline" className="font-mono">{roomRow.code}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Hosted by {roomRow.host_name} · Ep {roomRow.episode} · {roomRow.member_count} member{roomRow.member_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active rooms yet.</p>
            )}
          </div>

          <div className="rounded-3xl bg-card/50 ring-1 ring-border/60 p-6">
            <h2 className="font-display text-2xl font-semibold mb-4">Active room</h2>
            {code ? (
              room.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading room...</div>
              ) : room.data ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-1 ring-border/60">
                      <AvatarImage src={room.data.host_avatar_url || roomSeedAvatar(room.data.host_id)} alt={room.data.host_name} />
                      <AvatarFallback>{room.data.host_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-primary">Room code</p>
                      <h3 className="font-mono text-3xl font-semibold">{room.data.code}</h3>
                      <p className="text-sm text-muted-foreground">Hosted by {room.data.host_name}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="text-foreground">Title:</span> {room.data.title}</p>
                    <p><span className="text-foreground">Episode:</span> {room.data.episode}</p>
                    <p><span className="text-foreground">Members:</span> {room.data.member_count}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => copyRoomLink(room.data.code)}><Copy className="w-4 h-4 mr-2" /> Copy link</Button>
                    {room.data.mal_id ? <Button asChild className="bg-gradient-ember text-primary-foreground"><Link to={`/watch/${room.data.mal_id}?ep=${room.data.episode}&room=${room.data.code}`}>Open watch page</Link></Button> : null}
                    {user?.id === room.data.host_id ? (
                      <Button onClick={startWatchForEveryone} disabled={sendingStart}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        {sendingStart ? "Starting..." : "Start For Everyone"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">That room does not exist.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Create a room or join one from the left panel to see room details here.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-card/35 ring-1 ring-border/60 p-6">
          <h2 className="font-display text-2xl font-semibold mb-2">Share a room from the watch page</h2>
          <p className="text-sm text-muted-foreground">
            If you are already on an anime, fill in the room form from the watch page or this screen, then send the generated code to friends. The actual playback controls still live on the normal watch route.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Rooms;
