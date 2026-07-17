import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLocalParticipant, useParticipants } from '@livekit/react-native';
import { ParticipantEvent } from 'livekit-client';
import AppText from '@/components/AppText';

type LiveComment = { id: string; name: string; text: string; ts: number };

const TOPIC = 'live-comment';

// TextEncoder/TextDecoder are NOT guaranteed to exist as globals in every RN
// Hermes environment (confirmed: they don't here — using `new TextEncoder()`
// at module scope crashed the app at startup, not just this screen, since
// this file is imported by GoLiveScreen/LiveViewerScreen which are loaded
// eagerly by the navigator). These two helpers do the same UTF-8 <-> bytes
// conversion using only core, always-available JS globals
// (encodeURIComponent/decodeURIComponent + escape/unescape) — no dependency
// on any Web API that might be missing.
function utf8Encode(str: string): Uint8Array {
  const utf8 = unescape(encodeURIComponent(str));
  const arr = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
  return arr;
}
function utf8Decode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return decodeURIComponent(escape(str));
}

// Instagram/TikTok-style scrolling live comments — built entirely on
// LiveKit's own data channel. Every participant (host + all viewers) is
// ALREADY connected to the same LiveKit room, so this sends/receives over
// that existing connection: no backend endpoint, no socket, no new
// notification system. Drop this anywhere inside <LiveKitRoom>...</LiveKitRoom>
// — used identically on both the host's Go Live screen and the viewer screen.
//
// Sending: localParticipant.publishData(...) — official LiveKit API.
// Receiving: listens on each remote Participant's own DataReceived event
// (rather than a room-level listener) so this only depends on hooks already
// proven working elsewhere in this app (useLocalParticipant, useParticipants).
const LiveComments: React.FC<{ bottomOffset?: number }> = ({ bottomOffset = 100 }) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const addComment = useCallback((c: LiveComment) => {
    setComments((prev) => [...prev, c].slice(-100)); // cap so it can't grow forever
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // Listen for comments from every OTHER participant currently in the room.
  // Re-attaches whenever someone joins/leaves so late joiners are covered.
  useEffect(() => {
    const attached: Array<{ p: any; fn: (payload: Uint8Array) => void }> = [];
    participants.forEach((p: any) => {
      if (p.isLocal) return;
      const fn = (payload: Uint8Array) => {
        try {
          const parsed = JSON.parse(utf8Decode(payload));
          if (parsed?.topic === TOPIC && parsed?.text) {
            addComment({
              id: `${p.identity}-${parsed.ts}`,
              name: parsed.name || p.name || 'Guest',
              text: String(parsed.text).slice(0, 300),
              ts: parsed.ts,
            });
          }
        } catch {
          // ignore malformed payloads
        }
      };
      p.on(ParticipantEvent.DataReceived, fn);
      attached.push({ p, fn });
    });
    return () => {
      attached.forEach(({ p, fn }) => p.off(ParticipantEvent.DataReceived, fn));
    };
  }, [participants, addComment]);

  const send = () => {
    const text = input.trim();
    if (!text || !localParticipant) return;
    const ts = Date.now();
    const payload = utf8Encode(JSON.stringify({ topic: TOPIC, text, name: localParticipant.name, ts }));
    localParticipant.publishData(payload, { reliable: true, topic: TOPIC }).catch(() => undefined);
    // publishData does not echo back to the sender, so show our own comment immediately.
    addComment({ id: `me-${ts}`, name: localParticipant.name || 'You', text, ts });
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      {comments.length > 0 && (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(c) => c.id}
          style={styles.list}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <AppText variant="tiny" bold color="#fff">{item.name} </AppText>
              <AppText variant="tiny" color="#fff" style={{ flex: 1 }}>{item.text}</AppText>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Say something…"
          placeholderTextColor="rgba(255,255,255,0.55)"
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={send} style={styles.sendBtn} hitSlop={10} activeOpacity={0.8}>
          <Icon name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0 },
  list: { maxHeight: 140, paddingHorizontal: 16, marginBottom: 6 },
  commentRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start', maxWidth: '90%',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  input: {
    flex: 1, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, color: '#fff', fontSize: 13,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

export default LiveComments;