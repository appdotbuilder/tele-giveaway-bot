
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Giveaway, CreateGiveawayInput, UpdateGiveawayInput } from '../../server/src/schema';
import type { GiveawayResults } from '../../server/src/handlers/get_giveaway_results';

function App() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);
  const [giveawayResults, setGiveawayResults] = useState<GiveawayResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');

  // Create giveaway form state
  const [createForm, setCreateForm] = useState<CreateGiveawayInput>({
    title: '',
    description: '',
    required_channels: [],
    winner_count: 1,
    created_by: 1 // TODO: Replace with actual admin user ID
  });

  // Channel input state for creating giveaways
  const [channelInput, setChannelInput] = useState('');

  const loadGiveaways = useCallback(async () => {
    try {
      const result = await trpc.getGiveaways.query();
      setGiveaways(result);
    } catch (error) {
      console.error('Failed to load giveaways:', error);
    }
  }, []);

  useEffect(() => {
    loadGiveaways();
  }, [loadGiveaways]);

  const handleCreateGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.required_channels.length === 0) {
      alert('Please add at least one required channel');
      return;
    }
    
    setIsLoading(true);
    try {
      const newGiveaway = await trpc.createGiveaway.mutate(createForm);
      setGiveaways((prev: Giveaway[]) => [...prev, newGiveaway]);
      
      // Reset form
      setCreateForm({
        title: '',
        description: '',
        required_channels: [],
        winner_count: 1,
        created_by: 1
      });
      setChannelInput('');
      
      alert('🎉 Giveaway created successfully!');
    } catch (error) {
      console.error('Failed to create giveaway:', error);
      alert('Failed to create giveaway. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChannel = () => {
    if (channelInput.trim() && !createForm.required_channels.includes(channelInput.trim())) {
      setCreateForm((prev: CreateGiveawayInput) => ({
        ...prev,
        required_channels: [...prev.required_channels, channelInput.trim()]
      }));
      setChannelInput('');
    }
  };

  const handleRemoveChannel = (channelToRemove: string) => {
    setCreateForm((prev: CreateGiveawayInput) => ({
      ...prev,
      required_channels: prev.required_channels.filter(channel => channel !== channelToRemove)
    }));
  };

  const handleUpdateGiveawayStatus = async (giveawayId: number, newStatus: 'active' | 'completed' | 'cancelled') => {
    setIsLoading(true);
    try {
      const updateData: UpdateGiveawayInput = {
        id: giveawayId,
        status: newStatus
      };
      
      const updatedGiveaway = await trpc.updateGiveaway.mutate(updateData);
      setGiveaways((prev: Giveaway[]) =>
        prev.map(g => g.id === giveawayId ? updatedGiveaway : g)
      );
      
      alert(`✅ Giveaway status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update giveaway:', error);
      alert('Failed to update giveaway status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrawWinners = async (giveawayId: number) => {
    setIsLoading(true);
    try {
      await trpc.drawWinners.mutate({ giveaway_id: giveawayId });
      await loadGiveaways(); // Refresh giveaways to show updated status
      alert('🏆 Winners have been drawn successfully!');
    } catch (error) {
      console.error('Failed to draw winners:', error);
      alert('Failed to draw winners. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = async (giveawayId: number) => {
    setIsLoading(true);
    try {
      const results = await trpc.getGiveawayResults.query({ giveaway_id: giveawayId });
      setGiveawayResults(results);
      setSelectedGiveaway(giveaways.find(g => g.id === giveawayId) || null);
      setActiveTab('results');
    } catch (error) {
      console.error('Failed to load results:', error);
      alert('Failed to load giveaway results');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default' as const;
      case 'completed':
        return 'secondary' as const;
      case 'cancelled':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎁 Telegram Giveaway Manager</h1>
          <p className="text-gray-600">Create and manage fair, transparent giveaways for your Telegram community</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-lg">
            <TabsTrigger value="admin" className="text-lg">👨‍💼 Admin Panel</TabsTrigger>
            <TabsTrigger value="giveaways" className="text-lg">🎯 Active Giveaways</TabsTrigger>
            <TabsTrigger value="results" className="text-lg">🏆 Results</TabsTrigger>
          </TabsList>

          {/* Admin Panel */}
          <TabsContent value="admin" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <CardTitle className="text-2xl">➕ Create New Giveaway</CardTitle>
                <CardDescription className="text-indigo-100">
                  Set up a new giveaway with channel requirements and winner selection
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateGiveaway} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">Giveaway Title *</Label>
                      <Input
                        id="title"
                        placeholder="🎁 Amazing Prize Giveaway"
                        value={createForm.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateGiveawayInput) => ({ ...prev, title: e.target.value }))
                        }
                        required
                        className="border-gray-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="winner_count" className="text-sm font-medium">Number of Winners *</Label>
                      <Input
                        id="winner_count"
                        type="number"
                        min="1"
                        max="100"
                        value={createForm.winner_count}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateGiveawayInput) => ({ 
                            ...prev, 
                            winner_count: parseInt(e.target.value) || 1 
                          }))
                        }
                        required
                        className="border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your amazing giveaway, prizes, and any special rules..."
                      value={createForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateForm((prev: CreateGiveawayInput) => ({ ...prev, description: e.target.value }))
                      }
                      rows={4}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Required Telegram Channels *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="@your_channel or channel_id"
                        value={channelInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChannelInput(e.target.value)}
                        onKeyPress={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChannel();
                          }
                        }}
                        className="border-gray-300"
                      />
                      <Button type="button" onClick={handleAddChannel} variant="outline">
                        Add Channel
                      </Button>
                    </div>
                    
                    {createForm.required_channels.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                        {createForm.required_channels.map((channel: string) => (
                          <Badge key={channel} variant="secondary" className="flex items-center gap-2">
                            {channel}
                            <button
                              type="button"
                              onClick={() => handleRemoveChannel(channel)}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || !createForm.title || createForm.required_channels.length === 0}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  >
                    {isLoading ? '⏳ Creating...' : '🚀 Create Giveaway'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Admin Giveaway Management */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle className="text-xl">📊 Manage Existing Giveaways</CardTitle>
              </CardHeader>
              <CardContent>
                {giveaways.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">🎪 No giveaways created yet!</p>
                    <p>Create your first giveaway above to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {giveaways.map((giveaway: Giveaway) => (
                      <div key={giveaway.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{giveaway.title}</h3>
                            <p className="text-sm text-gray-600">{giveaway.description}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(giveaway.status)}>
                            {giveaway.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <strong>Winners:</strong> {giveaway.winner_count}
                          </div>
                          <div>
                            <strong>Created:</strong> {formatDate(giveaway.created_at)}
                          </div>
                          <div>
                            <strong>Required Channels:</strong> {giveaway.required_channels.length}
                          </div>
                          {giveaway.draw_timestamp && (
                            <div>
                              <strong>Draw Time:</strong> {formatDate(giveaway.draw_timestamp)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {giveaway.status === 'active' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="default">
                                    🎲 Draw Winners
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Draw Winners</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will randomly select {giveaway.winner_count} winner(s) from eligible participants. 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDrawWinners(giveaway.id)}>
                                      Draw Winners
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleUpdateGiveawayStatus(giveaway.id, 'cancelled')}
                              >
                                ❌ Cancel
                              </Button>
                            </>
                          )}
                          
                          {giveaway.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewResults(giveaway.id)}
                            >
                              👁️ View Results
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Giveaways */}
          <TabsContent value="giveaways" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
                <CardTitle className="text-2xl">🎯 Active Giveaways</CardTitle>
                <CardDescription className="text-green-100">
                  Join these exciting giveaways through our Telegram bot!
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {giveaways.filter(g => g.status === 'active').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">🎪 No active giveaways right now!</p>
                    <p>Check back later for exciting opportunities.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {giveaways
                      .filter(g => g.status === 'active')
                      .map((giveaway: Giveaway) => (
                        <Card key={giveaway.id} className="border-2 border-green-200 hover:border-green-400 transition-colors">
                          <CardHeader>
                            <CardTitle className="text-lg text-green-800">{giveaway.title}</CardTitle>
                            <CardDescription>{giveaway.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">🏆 Winners:</span>
                                <span>{giveaway.winner_count}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">📅 Created:</span>
                                <span>{formatDate(giveaway.created_at)}</span>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm font-medium">📺 Required Channels:</p>
                                <div className="flex flex-wrap gap-1">
                                  {giveaway.required_channels.map((channel: string) => (
                                    <Badge key={channel} variant="outline" className="text-xs">
                                      {channel}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="pt-4">
                                <Button className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
                                  🤖 Join via Telegram Bot
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results */}
          <TabsContent value="results" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
                <CardTitle className="text-2xl">🏆 Giveaway Results</CardTitle>
                <CardDescription className="text-yellow-100">
                  Transparent and verifiable results for completed giveaways
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!selectedGiveaway || !giveawayResults ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">Select a completed giveaway to view results:</p>
                    <div className="grid gap-3">
                      {giveaways
                        .filter(g => g.status === 'completed')
                        .map((giveaway: Giveaway) => (
                          <div
                            key={giveaway.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewResults(giveaway.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-medium">{giveaway.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {giveaway.winner_count} winner(s) • Completed {formatDate(giveaway.updated_at)}
                                </p>
                              </div>
                              <Button variant="outline" size="sm">View Results</Button>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    {giveaways.filter(g => g.status === 'completed').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-lg">🎪 No completed giveaways yet!</p>
                        <p>Results will appear here once giveaways are completed.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedGiveaway.title}</h2>
                        <p className="text-gray-600">{selectedGiveaway.description}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedGiveaway(null);
                          setGiveawayResults(null);
                        }}
                      >
                        ← Back to Results List
                      </Button>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="text-center">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-blue-600">{giveawayResults.total_participants}</div>
                          <div className="text-sm text-gray-600">Total Participants</div>
                        </CardContent>
                      </Card>
                      <Card className="text-center">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-green-600">{giveawayResults.eligible_participants}</div>
                          <div className="text-sm text-gray-600">Eligible Participants</div>
                        </CardContent>
                      </Card>
                      <Card className="text-center">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-purple-600">{giveawayResults.winners.length}</div>
                          <div className="text-sm text-gray-600">Winners Selected</div>
                        </CardContent>
                      </Card>
                      <Card className="text-center">
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-orange-600">
                            {giveawayResults.draw_timestamp ? formatDate(giveawayResults.draw_timestamp) : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">Draw Date</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Winners List */}
                    {giveawayResults.winners.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-xl">🎉 Winners</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {giveawayResults.winners.map((winner) => (
                              <div key={winner.position} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center space-x-3">
                                  <div className="text-2xl">
                                    {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '👑'}
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {winner.user.first_name} {winner.user.last_name || ''}
                                    </div>
                                    {winner.user.username && (
                                      <div className="text-sm text-gray-600">@{winner.user.username}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">#{winner.position}</Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatDate(winner.selected_at)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                          <p>No winners selected yet.</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Fairness Data */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">🔒 Fairness & Transparency</CardTitle>
                        <CardDescription>
                          Technical data to verify the fairness and reproducibility of the winner selection
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Participant Hash</Label>
                            <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                              {giveawayResults.fairness_data.participant_hash || 'Not available'}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Hash of the participant list used for winner selection
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Randomization Seed</Label>
                            <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                              {giveawayResults.fairness_data.randomization_seed || 'Not available'}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Random seed used for reproducible winner selection
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
